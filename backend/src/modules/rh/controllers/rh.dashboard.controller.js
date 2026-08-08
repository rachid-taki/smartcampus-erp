require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Status values that count as "pending" (awaiting HR action)
const PENDING_STATUTS = ['Soumise', 'En_Traitement'];

// Type groupings for the "demandesEnAttente" breakdown
const CONGE_TYPES = ['Conge_Normal', 'Conge_Exceptionnel', 'Conge_Maladie'];
const ATTESTATION_TYPES = ['Attestation_Travail', 'Attestation_Salaire'];
const HEURE_SUP_TYPE = 'Heure_Supplementaire';

/**
 * GET /api/rh/dashboard/stats
 *
 * Fetch aggregated KPIs for the HR (RH) dashboard:
 *  - totalEmployes: total employee count
 *  - employesActifs: count of employees with statut 'Actif'
 *  - employesEnConge: count of employees with statut 'Conge'
 *  - demandesEnAttente: pending DemandeRh requests broken down by
 *    category (conges / attestations / heuresSup)
 *  - employesParDepartement: employee count grouped by departement
 *  - demandesRecentes: the 5 most recently submitted DemandeRh records,
 *    including the requesting employee's identity
 *
 * All queries run in parallel via Promise.all for performance, since
 * none of them depend on each other's results.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalEmployes,
      employesActifs,
      employesEnConge,
      demandesCongesEnAttente,
      demandesAttestationsEnAttente,
      demandesHeuresSupEnAttente,
      employesParDepartementRaw,
      demandesRecentes,
    ] = await Promise.all([
      // 1. Total employee count
      prisma.employe.count(),

      // 2. Active employees
      prisma.employe.count({
        where: { statut: 'Actif' },
      }),

      // 3. Employees currently on leave
      prisma.employe.count({
        where: { statut: 'Conge' },
      }),

      // 4a. Pending leave requests (Conge_Normal, Conge_Exceptionnel, Conge_Maladie)
      prisma.demandeRh.count({
        where: {
          statut: { in: PENDING_STATUTS },
          type: { in: CONGE_TYPES },
        },
      }),

      // 4b. Pending attestation requests (Attestation_Travail, Attestation_Salaire)
      prisma.demandeRh.count({
        where: {
          statut: { in: PENDING_STATUTS },
          type: { in: ATTESTATION_TYPES },
        },
      }),

      // 4c. Pending overtime requests (Heure_Supplementaire)
      prisma.demandeRh.count({
        where: {
          statut: { in: PENDING_STATUTS },
          type: HEURE_SUP_TYPE,
        },
      }),

      // 5. Employee count grouped by departement
      prisma.employe.groupBy({
        by: ['departement'],
        _count: { _all: true },
      }),

      // 6. 5 most recent DemandeRh, with requesting employee's identity
      prisma.demandeRh.findMany({
        take: 5,
        orderBy: { date_demande: 'desc' },
        include: {
          employe: {
            include: {
              utilisateur: {
                select: { nom: true, prenom: true },
              },
            },
          },
        },
      }),
    ]);

    // Reshape groupBy output into a clean { departement, count } array
    const employesParDepartement = employesParDepartementRaw.map((entry) => ({
      departement: entry.departement,
      count: entry._count._all,
    }));

    const stats = {
      totalEmployes,
      employesActifs,
      employesEnConge,
      demandesEnAttente: {
        conges: demandesCongesEnAttente,
        attestations: demandesAttestationsEnAttente,
        heuresSup: demandesHeuresSupEnAttente,
      },
      employesParDepartement,
      demandesRecentes,
    };

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[RH Dashboard] Failed to fetch dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des statistiques du tableau de bord.',
    });
  }
};

module.exports = {
  getDashboardStats,
};