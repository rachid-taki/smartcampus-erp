require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// GET /api/clubs-dashboard/stats
// ---------------------------------------------------------------------------

exports.getStats = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // On exécute TOUTES les requêtes en parallèle grâce à Promise.all
    const [
      clubsTotal,
      clubsActifs,
      demandesEnAttente,
      reservationsEnAttente,
      sessionsEnCours,
      sessionsAujourdHui,
      alertesATraiter,
      alertesCritiques
    ] = await Promise.all([
      prisma.club.count(),
      prisma.club.count({ where: { statut: 'Actif' } }),
      prisma.demandeClub.count({ where: { statut: { in: ['Soumise', 'En_Revue'] } } }),
      prisma.reservationSalle.count({ where: { statut: 'Demandee' } }),
      prisma.sessionSalle.count({ where: { statut: 'En_Cours' } }),
      prisma.sessionSalle.count({ where: { date: { gte: startOfDay, lte: endOfDay } } }),
      
      // On utilise les VRAIS noms de votre schéma (AlerteIa, Nouvelle/En_Traitement, priorite)
      prisma.alerteIa.count({ where: { statut: { in: ['Nouvelle', 'En_Traitement'] } } }),
      prisma.alerteIa.count({ where: { statut: { in: ['Nouvelle', 'En_Traitement'] }, priorite: 'Urgente' } })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        clubs: { total: clubsTotal, actifs: clubsActifs },
        demandes: { enAttente: demandesEnAttente },
        reservations: { enAttente: reservationsEnAttente },
        sessions: { 
          enCours: sessionsEnCours,
          aujourdHui: sessionsAujourdHui
        },
        alertes: { 
          aTraiter: alertesATraiter, 
          critiques: alertesCritiques 
        },
      },
    });
  } catch (error) {
    console.error('[dashboard.controller] getStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des statistiques du tableau de bord.',
    });
  }
};