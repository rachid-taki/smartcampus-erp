require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // ─── DEMANDES (prisma.demande) ───
    const [
      demandesSoumises,
      demandesEnTraitement,
      demandesValidees,
      demandesRejetees,
      demandesCloturees,
      demandesTotal,
    ] = await Promise.all([
      prisma.demande.count({ where: { statut: 'Soumise' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'En_Traitement' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'Validee' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'Rejetee' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'Cloturee' } }).catch(() => 0),
      prisma.demande.count().catch(() => 0),
    ]);

    // ─── RÉCLAMATIONS (prisma.reclamation) ───
    const [
      reclamationsSoumises,
      reclamationsRecues,
      reclamationsTransmises,
      reclamationsAcceptees,
      reclamationsRejetees,
      reclamationsCloturees,
      reclamationsTotal,
    ] = await Promise.all([
      prisma.reclamation.count({ where: { statut: 'Soumise' } }).catch(() => 0),
      prisma.reclamation.count({ where: { statut: 'Recue' } }).catch(() => 0),
      prisma.reclamation.count({ where: { statut: 'Transmise' } }).catch(() => 0),
      prisma.reclamation.count({ where: { statut: 'Acceptee' } }).catch(() => 0),
      prisma.reclamation.count({ where: { statut: 'Rejetee' } }).catch(() => 0),
      prisma.reclamation.count({ where: { statut: 'Cloturee' } }).catch(() => 0),
      prisma.reclamation.count().catch(() => 0),
    ]);

    const reclamationsOuvertes = reclamationsSoumises + reclamationsRecues + reclamationsTransmises;

    // ─── CERTIFICATS (prisma.certificatMedical) ← camelCase! ───
    const [
      certificatsEnAttente,
      certificatsValides,
      certificatsRejetes,
      certificatsTotal,
    ] = await Promise.all([
      prisma.certificatMedical.count({ where: { statut: 'En_Attente' } }).catch(() => 0),
      prisma.certificatMedical.count({ where: { statut: 'Valide' } }).catch(() => 0),
      prisma.certificatMedical.count({ where: { statut: 'Rejete' } }).catch(() => 0),
      prisma.certificatMedical.count().catch(() => 0),
    ]);

    // ─── VÉRIFICATIONS (prisma.verificationExam) ← camelCase! ───
    const [
      verificationsDemandees,
      verificationsPlanifiees,
      verificationsAcceptees,
      verificationsTotal,
    ] = await Promise.all([
      prisma.verificationExam.count({ where: { statut: 'Demandee' } }).catch(() => 0),
      prisma.verificationExam.count({ where: { statut: 'Planifiee' } }).catch(() => 0),
      prisma.verificationExam.count({ where: { statut: 'Acceptee' } }).catch(() => 0),
      prisma.verificationExam.count().catch(() => 0),
    ]);

    // ─── SALLES (prisma.salle) + SESSIONS (prisma.sessionSalle) + RÉSERVATIONS (prisma.reservationSalle) ───
    const [
      sallesDisponibles,
      sallesOccupees,
      sallesMaintenance,
      sallesTotal,
      sessionsAujourdhui,
      reservationsEnAttente,
    ] = await Promise.all([
      prisma.salle.count({ where: { statut: 'Disponible' } }).catch(() => 0),
      prisma.salle.count({ where: { statut: 'Occupee' } }).catch(() => 0),
      prisma.salle.count({ where: { statut: 'Maintenance' } }).catch(() => 0),
      prisma.salle.count().catch(() => 0),
      prisma.sessionSalle.count({
        where: {
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }).catch(() => 0),
      prisma.reservationSalle.count({ where: { statut: 'Demandee' } }).catch(() => 0),
    ]);

    // ─── CLUBS (prisma.club) + DEMANDES CLUBS (prisma.demandeClub) ───
    const [
      clubsActifs,
      clubsInactifs,
      clubsSuspendus,
      clubsTotal,
      demandesClubsEnAttente,
    ] = await Promise.all([
      prisma.club.count({ where: { statut: 'Actif' } }).catch(() => 0),
      prisma.club.count({ where: { statut: 'Inactif' } }).catch(() => 0),
      prisma.club.count({ where: { statut: 'Suspendu' } }).catch(() => 0),
      prisma.club.count().catch(() => 0),
      prisma.demandeClub.count({
        where: { statut: { in: ['Soumise', 'En_Revue'] } },
      }).catch(() => 0),
    ]);

    // ─── DOCUMENTS OFFICIELS (prisma.documentOfficiel) ← camelCase! ───
    const [documentsAujourdhui, documentsSemaine] = await Promise.all([
      prisma.documentOfficiel.count({
        where: {
          date_generation: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }).catch(() => 0),
      prisma.documentOfficiel.count({
        where: { date_generation: { gte: weekAgo } },
      }).catch(() => 0),
    ]);

    // ─── NOTIFICATIONS (prisma.utilisateur avec relation notifications) ───
    const [etudiantsANotifier, enseignantsANotifier] = await Promise.all([
      prisma.utilisateur.count({
        where: {
          role: { nom_role: 'ETUDIANT' },
          notifications: { some: { lu: false } },
        },
      }).catch(() => 0),
      prisma.utilisateur.count({
        where: {
          role: { nom_role: { in: ['PROFESSOR', 'PROFESSEUR'] } },
          notifications: { some: { lu: false } },
        },
      }).catch(() => 0),
    ]);

    // ─── ACTIVITÉ RÉCENTE ───
    const recentDemandes = await prisma.demande.findMany({
      take: 5,
      orderBy: { date_creation: 'desc' },
      include: {
        type_demande: {
          select: { libelle: true, code: true },
        },
      },
    }).catch(() => []);

    const formattedRecentActivity = (recentDemandes || []).map((item) => ({
      idDemande: item.id_demande,
      numero: item.numero,
      objet: item.objet,
      statut: item.statut,
      dateCreation: item.date_creation ? item.date_creation.toISOString() : new Date().toISOString(),
      typeDemande: item.type_demande?.libelle || 'N/A',
    }));

    const activityLast14Days = [];
for (let i = 13; i >= 0; i--) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - i);
  const next = new Date(d);
  next.setDate(d.getDate() + 1);

  const [dem, rec] = await Promise.all([
    prisma.demande.count({ where: { date_creation: { gte: d, lt: next } } }).catch(() => 0),
    prisma.reclamation.count({ where: { date_soumission: { gte: d, lt: next } } }).catch(() => 0),
  ]);

  activityLast14Days.push({
    name: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    Demandes: dem,
    Reclamations: rec,
  });
}

const demandesByStatus = [
  { name: 'Soumises', value: demandesSoumises, color: '#3b82f6' },
  { name: 'En traitement', value: demandesEnTraitement, color: '#f59e0b' },
  { name: 'Validées', value: demandesValidees, color: '#10b981' },
  { name: 'Rejetées', value: demandesRejetees, color: '#f43f5e' },
  { name: 'Clôturées', value: demandesCloturees, color: '#64748b' },
].filter((s) => s.value > 0);

const sessionsNext7Days = [];
for (let i = 0; i < 7; i++) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + i);
  const next = new Date(d);
  next.setDate(d.getDate() + 1);

  const count = await prisma.sessionSalle.count({
    where: { date: { gte: d, lt: next } },
  }).catch(() => 0);

  sessionsNext7Days.push({
    name: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
    Sessions: count,
  });
}

        return res.status(200).json({
      success: true,
      data: {
        demandesStats: {
          soumises: demandesSoumises,
          enTraitement: demandesEnTraitement,
          validees: demandesValidees,
          rejetees: demandesRejetees,
          cloturees: demandesCloturees,
          total: demandesTotal,
        },
        reclamationsStats: {
          soumises: reclamationsSoumises,
          recues: reclamationsRecues,
          transmises: reclamationsTransmises,
          acceptees: reclamationsAcceptees,
          rejetees: reclamationsRejetees,
          cloturees: reclamationsCloturees,
          ouvertes: reclamationsOuvertes,
          total: reclamationsTotal,
        },
        certificatsStats: {
          enAttente: certificatsEnAttente,
          valides: certificatsValides,
          rejetes: certificatsRejetes,
          total: certificatsTotal,
        },
        verificationsStats: {
          demandees: verificationsDemandees,
          planifiees: verificationsPlanifiees,
          acceptees: verificationsAcceptees,
          total: verificationsTotal,
        },
        sallesStats: {
          disponibles: sallesDisponibles,
          occupees: sallesOccupees,
          maintenance: sallesMaintenance,
          total: sallesTotal,
          sessionsAujourdhui,
          reservationsEnAttente,
        },
        clubsStats: {
          actifs: clubsActifs,
          inactifs: clubsInactifs,
          suspendus: clubsSuspendus,
          total: clubsTotal,
          demandesEnAttente: demandesClubsEnAttente,
        },
        documentsOfficielsStats: {
          genereAujourdhui: documentsAujourdhui,
          totalSemaine: documentsSemaine,
        },
        notificationsStats: {
          etudiantsANotifier,
          enseignantsANotifier,
        },
        recentActivity: formattedRecentActivity,
        // ✅ AJOUTER CES 3 LIGNES
        activityLast14Days,
        demandesByStatus,
        sessionsNext7Days,
      },
    });
  } catch (error) {
    console.error('[Scolarité Dashboard] Failed to fetch stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des statistiques.',
    });
  }
};

const getUtilisateursPourNotification = async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = {
      actif: true,
      role: role === 'PROFESSOR'
        ? { nom_role: { in: ['PROFESSOR', 'PROFESSEUR'] } }
        : { nom_role: role || 'ETUDIANT' },
    };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.utilisateur.findMany({
      where,
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: { select: { nom_role: true } },
      },
      orderBy: { nom: 'asc' },
      take: 50,
    });

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('[Scolarité] Failed to fetch utilisateurs:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des utilisateurs.' });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { titre, message, type, priorite, cible, userIds } = req.body;

    if (!titre || !message) {
      return res.status(400).json({ success: false, message: 'Titre et message requis.' });
    }

    let targets = [];

    if (cible === 'specifique' && Array.isArray(userIds) && userIds.length > 0) {
      targets = userIds;
    } else {
      const where = { actif: true };
      if (cible === 'etudiants') where.role = { nom_role: 'ETUDIANT' };
      else if (cible === 'enseignants') where.role = { nom_role: { in: ['PROFESSOR', 'PROFESSEUR'] } }

      const users = await prisma.utilisateur.findMany({
        where,
        select: { id_utilisateur: true },
      });
      targets = users.map((u) => u.id_utilisateur);
    }

    if (targets.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun destinataire trouvé.' });
    }

    await prisma.notification.createMany({
      data: targets.map((id) => ({
        id_utilisateur: id,
        titre,
        message,
        type: type || 'Info',
        priorite: priorite || 'Info',
      })),
    });

    return res.status(200).json({ success: true, count: targets.length });
  } catch (error) {
    console.error('[Scolarité] Failed to send notification:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de la notification.' });
  }
};

module.exports = { getDashboardStats, getUtilisateursPourNotification, sendNotification };