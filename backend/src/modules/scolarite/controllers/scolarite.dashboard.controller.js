// 1. Force load the environment variables immediately before anything else runs!
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// 2. Grab the URL and remove the Prisma-specific "?schema=public" part 
const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];

// 3. Initialize the standard PostgreSQL pool using the cleaned string
const pool = new Pool({ connectionString: cleanUrl });

// 4. Wrap it in the Prisma Adapter
const adapter = new PrismaPg(pool);

// 5. Pass the adapter into the Prisma Client constructor
const prisma = new PrismaClient({ adapter });

const getDashboardStats = async (req, res) => {
  try {
    const [
      demandesSoumisesCount,
      demandesEnTraitementCount,
      reclamationsOuvertesCount,
      certificatsEnAttenteCount,
      recentDemandes,
    ] = await Promise.all([
      // 1. DEMANDE - Total requests with status "Soumise"
      prisma.demande.count({
        where: { statut: 'Soumise' },
      }).catch(() => 0),

      // 2. DEMANDE - Total requests with status "En_Traitement"
      prisma.demande.count({
        where: { statut: 'En_Traitement' },
      }).catch(() => 0),

      // 3. RECLAMATION - Total open complaints (matching SQL enum values: Soumise, Recue)
      prisma.reclamation.count({
        where: {
          statut: {
            in: ['Soumise', 'Recue'],
          },
        },
      }).catch(() => 0),

      // 4. CERTIFICAT_MEDICAL - Total certificates awaiting validation
      prisma.certificatMedical.count({
        where: { statut: 'En_Attente' },
      }).catch(() => 0),

      // 5. DEMANDE - 5 most recent requests, using exact snake_case columns
      prisma.demande.findMany({
        take: 5,
        orderBy: { date_creation: 'desc' },
        select: {
          id_demande: true,
          numero: true,
          objet: true,
          statut: true,
          date_creation: true,
        },
      }).catch(() => []),
    ]);

    // Map snake_case database output to the camelCase structure expected by your React frontend
    const formattedRecentActivity = recentDemandes.map((item) => ({
      idDemande: item.id_demande,
      numero: item.numero,
      objet: item.objet,
      statut: item.statut,
      dateCreation: item.date_creation,
    }));

    const stats = {
      demandesStats: {
        soumises: demandesSoumisesCount,
        enTraitement: demandesEnTraitementCount,
      },
      reclamationsStats: {
        ouvertes: reclamationsOuvertesCount,
      },
      certificatsStats: {
        enAttente: certificatsEnAttenteCount,
      },
      recentActivity: formattedRecentActivity,
    };

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Scolarité Dashboard] Failed to fetch stats:', error);

    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des statistiques du tableau de bord.',
    });
  }
};

module.exports = { getDashboardStats };