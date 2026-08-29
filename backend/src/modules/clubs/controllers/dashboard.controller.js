require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || '';
const cleanUrl = rawUrl.split('?')[0];

const pool = new Pool({
  connectionString: cleanUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

// ---------------------------------------------------------------------------
// GET /api/clubs-dashboard/stats
// Dashboard global — Clubs & Vie Étudiante
// ---------------------------------------------------------------------------

exports.getStats = async (req, res) => {
  try {
    const [
      clubsTotal,
      clubsActifs,
      clubsInactifs,
      clubsSuspendus,

      presidentsActifs,

      demandesEnAttente,
      demandesApprouvees,
      demandesRejetees,
      demandesTotal,

      evenementsApprouves,

      budgetGlobal,
      budgetMoyen,

      demandesParType,
      demandesParStatut,

      demandesRecentes,

      evenementsAVenir,
    ] = await Promise.all([
      // ---------------------------------------------------------------------
      // CLUBS
      // ---------------------------------------------------------------------

      prisma.club.count(),

      prisma.club.count({
        where: {
          statut: 'Actif',
        },
      }),

      prisma.club.count({
        where: {
          statut: 'Inactif',
        },
      }),

      prisma.club.count({
        where: {
          statut: 'Suspendu',
        },
      }),

      // ---------------------------------------------------------------------
      // PRESIDENTS
      // ---------------------------------------------------------------------

      prisma.presidentClub.count({
        where: {
          statut: 'Actif',
        },
      }),

      // ---------------------------------------------------------------------
      // DEMANDES
      // ---------------------------------------------------------------------

      prisma.demandeClub.count({
        where: {
          statut: {
            in: ['Soumise', 'En_Revue'],
          },
        },
      }),

      prisma.demandeClub.count({
        where: {
          statut: 'Approuvee',
        },
      }),

      prisma.demandeClub.count({
        where: {
          statut: 'Rejetee',
        },
      }),

      prisma.demandeClub.count(),

      // ---------------------------------------------------------------------
      // EVENEMENTS
      // ---------------------------------------------------------------------

      prisma.demandeClub.count({
        where: {
          type: 'Evenement',
          statut: 'Approuvee',
        },
      }),

      // ---------------------------------------------------------------------
      // BUDGET
      // ---------------------------------------------------------------------

      prisma.club.aggregate({
        _sum: {
          budget: true,
        },
      }),

      prisma.club.aggregate({
        _avg: {
          budget: true,
        },
      }),

      // ---------------------------------------------------------------------
      // REPARTITION DES DEMANDES PAR TYPE
      // ---------------------------------------------------------------------

      prisma.demandeClub.groupBy({
        by: ['type'],
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            type: 'desc',
          },
        },
      }),

      // ---------------------------------------------------------------------
      // REPARTITION DES DEMANDES PAR STATUT
      // ---------------------------------------------------------------------

      prisma.demandeClub.groupBy({
        by: ['statut'],
        _count: {
          _all: true,
        },
      }),

      // ---------------------------------------------------------------------
      // DEMANDES RECENTES
      // ---------------------------------------------------------------------

      prisma.demandeClub.findMany({
        take: 6,

        orderBy: {
          date_demande: 'desc',
        },

        select: {
          id_demande_club: true,
          objet: true,
          type: true,
          statut: true,
          date_demande: true,
          budget_demande: true,

          club: {
            select: {
              nom: true,
            },
          },
        },
      }),

      // ---------------------------------------------------------------------
      // EVENEMENTS A VENIR
      // ---------------------------------------------------------------------

      prisma.demandeClub.findMany({
        where: {
          type: 'Evenement',

          statut: 'Approuvee',

          date_evenement: {
            gte: new Date(),
          },
        },

        take: 5,

        orderBy: {
          date_evenement: 'asc',
        },

        select: {
          id_demande_club: true,
          objet: true,
          date_evenement: true,
          heure_debut: true,
          heure_fin: true,

          club: {
            select: {
              nom: true,
            },
          },
        },
      }),
    ]);

    // -----------------------------------------------------------------------
    // CALCULS
    // -----------------------------------------------------------------------

    const budgetTotal = Number(budgetGlobal._sum.budget || 0);

    const budgetMoyenValue = Number(
      budgetMoyen._avg.budget || 0
    );

    const tauxActivite =
      clubsTotal > 0
        ? Math.round((clubsActifs / clubsTotal) * 100)
        : 0;

    const tauxApprobation =
      demandesTotal > 0
        ? Math.round((demandesApprouvees / demandesTotal) * 100)
        : 0;

    // -----------------------------------------------------------------------
    // FORMAT DEMANDES PAR TYPE
    // -----------------------------------------------------------------------

    const typesLabels = {
      Evenement: 'Événements',
      Salle: 'Salles',
      Materiel: 'Matériel',
      Budget: 'Budget',
      Communication: 'Communication',
      Sponsoring: 'Sponsoring',
    };

    const demandesTypesFormatted = demandesParType.map((item) => ({
      type: item.type,
      label: typesLabels[item.type] || item.type,
      total: item._count._all,
    }));

    // -----------------------------------------------------------------------
    // FORMAT DEMANDES PAR STATUT
    // -----------------------------------------------------------------------

    const statutsLabels = {
      Soumise: 'Soumises',
      En_Revue: 'En revue',
      Approuvee: 'Approuvées',
      Rejetee: 'Rejetées',
    };

    const demandesStatutsFormatted = demandesParStatut.map((item) => ({
      statut: item.statut,
      label: statutsLabels[item.statut] || item.statut,
      total: item._count._all,
    }));

    // -----------------------------------------------------------------------
    // FORMAT DEMANDES RECENTES
    // -----------------------------------------------------------------------

    const recentRequests = demandesRecentes.map((item) => ({
      id: item.id_demande_club,
      objet: item.objet,
      type: item.type,
      statut: item.statut,
      date: item.date_demande,
      budget: item.budget_demande
        ? Number(item.budget_demande)
        : 0,
      club: item.club?.nom || 'Club inconnu',
    }));

    // -----------------------------------------------------------------------
    // FORMAT EVENEMENTS
    // -----------------------------------------------------------------------

    const upcomingEvents = evenementsAVenir.map((event) => ({
      id: event.id_demande_club,
      objet: event.objet,
      date: event.date_evenement,
      heureDebut: event.heure_debut,
      heureFin: event.heure_fin,
      club: event.club?.nom || 'Club inconnu',
    }));

    // -----------------------------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------------------------

    return res.status(200).json({
      success: true,

      data: {
        clubs: {
          total: clubsTotal,
          actifs: clubsActifs,
          inactifs: clubsInactifs,
          suspendus: clubsSuspendus,
          tauxActivite,
        },

        presidents: {
          actifs: presidentsActifs,
        },

        demandes: {
          total: demandesTotal,
          enAttente: demandesEnAttente,
          approuvees: demandesApprouvees,
          rejetees: demandesRejetees,
          tauxApprobation,
        },

        evenements: {
          approuves: evenementsApprouves,
          aVenir: upcomingEvents.length,
          prochains: upcomingEvents,
        },

        budget: {
          total: budgetTotal,
          moyen: budgetMoyenValue,
        },

        analytics: {
          parType: demandesTypesFormatted,
          parStatut: demandesStatutsFormatted,
        },

        activiteRecente: recentRequests,
      },
    });
  } catch (error) {
    console.error(
      '[clubs-dashboard.controller] getStats error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Erreur serveur lors de la récupération des statistiques des clubs.',

      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};