require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const nodemailer = require('nodemailer');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── STATISTIQUES DU DASHBOARD ───
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      demandesSoumises, demandesEnTraitement, demandesValidees, demandesRejetees, demandesCloturees, demandesTotal,
    ] = await Promise.all([
      prisma.demande.count({ where: { statut: 'Soumise' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'En_Traitement' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'Validee' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'Rejetee' } }).catch(() => 0),
      prisma.demande.count({ where: { statut: 'Cloturee' } }).catch(() => 0),
      prisma.demande.count().catch(() => 0),
    ]);

    const [
      reclamationsSoumises, reclamationsRecues, reclamationsTransmises, reclamationsAcceptees, reclamationsRejetees, reclamationsCloturees, reclamationsTotal,
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

    const [
      certificatsEnAttente, certificatsValides, certificatsRejetes, certificatsTotal,
    ] = await Promise.all([
      prisma.certificatMedical.count({ where: { statut: 'En_Attente' } }).catch(() => 0),
      prisma.certificatMedical.count({ where: { statut: 'Valide' } }).catch(() => 0),
      prisma.certificatMedical.count({ where: { statut: 'Rejete' } }).catch(() => 0),
      prisma.certificatMedical.count().catch(() => 0),
    ]);

    const [
      verificationsDemandees, verificationsPlanifiees, verificationsAcceptees, verificationsTotal,
    ] = await Promise.all([
      prisma.verificationExam.count({ where: { statut: 'Demandee' } }).catch(() => 0),
      prisma.verificationExam.count({ where: { statut: 'Planifiee' } }).catch(() => 0),
      prisma.verificationExam.count({ where: { statut: 'Acceptee' } }).catch(() => 0),
      prisma.verificationExam.count().catch(() => 0),
    ]);

    const [
      sallesDisponibles, sallesOccupees, sallesMaintenance, sallesTotal, sessionsAujourdhui, reservationsEnAttente,
    ] = await Promise.all([
      prisma.salle.count({ where: { statut: 'Disponible' } }).catch(() => 0),
      prisma.salle.count({ where: { statut: 'Occupee' } }).catch(() => 0),
      prisma.salle.count({ where: { statut: 'Maintenance' } }).catch(() => 0),
      prisma.salle.count().catch(() => 0),
      prisma.sessionSalle.count({
        where: { date: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } },
      }).catch(() => 0),
      prisma.reservationSalle.count({ where: { statut: 'Demandee' } }).catch(() => 0),
    ]);

    const [
      clubsActifs, clubsInactifs, clubsSuspendus, clubsTotal, demandesClubsEnAttente,
    ] = await Promise.all([
      prisma.club.count({ where: { statut: 'Actif' } }).catch(() => 0),
      prisma.club.count({ where: { statut: 'Inactif' } }).catch(() => 0),
      prisma.club.count({ where: { statut: 'Suspendu' } }).catch(() => 0),
      prisma.club.count().catch(() => 0),
      prisma.demandeClub.count({ where: { statut: { in: ['Soumise', 'En_Revue'] } } }).catch(() => 0),
    ]);

    const [documentsAujourdhui, documentsSemaine] = await Promise.all([
      prisma.documentOfficiel.count({
        where: { date_generation: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } },
      }).catch(() => 0),
      prisma.documentOfficiel.count({ where: { date_generation: { gte: weekAgo } } }).catch(() => 0),
    ]);

    const [etudiantsANotifier, enseignantsANotifier] = await Promise.all([
      prisma.utilisateur.count({
        where: { role: { nom_role: 'ETUDIANT' }, notifications: { some: { lu: false } } },
      }).catch(() => 0),
      prisma.utilisateur.count({
        where: { role: { nom_role: { in: ['PROFESSOR', 'PROFESSEUR'] } }, notifications: { some: { lu: false } } },
      }).catch(() => 0),
    ]);

    const recentDemandes = await prisma.demande.findMany({
      take: 5,
      orderBy: { date_creation: 'desc' },
      include: { type_demande: { select: { libelle: true, code: true } } },
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

      const count = await prisma.sessionSalle.count({ where: { date: { gte: d, lt: next } } }).catch(() => 0);
      sessionsNext7Days.push({
        name: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        Sessions: count,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        demandesStats: { soumises: demandesSoumises, enTraitement: demandesEnTraitement, validees: demandesValidees, rejetees: demandesRejetees, cloturees: demandesCloturees, total: demandesTotal },
        reclamationsStats: { soumises: reclamationsSoumises, recues: reclamationsRecues, transmises: reclamationsTransmises, acceptees: reclamationsAcceptees, rejetees: reclamationsRejetees, cloturees: reclamationsCloturees, ouvertes: reclamationsOuvertes, total: reclamationsTotal },
        certificatsStats: { enAttente: certificatsEnAttente, valides: certificatsValides, rejetes: certificatsRejetes, total: certificatsTotal },
        verificationsStats: { demandees: verificationsDemandees, planifiees: verificationsPlanifiees, acceptees: verificationsAcceptees, total: verificationsTotal },
        sallesStats: { disponibles: sallesDisponibles, occupees: sallesOccupees, maintenance: sallesMaintenance, total: sallesTotal, sessionsAujourdhui, reservationsEnAttente },
        clubsStats: { actifs: clubsActifs, inactifs: clubsInactifs, suspendus: clubsSuspendus, total: clubsTotal, demandesEnAttente: demandesClubsEnAttente },
        documentsOfficielsStats: { genereAujourdhui: documentsAujourdhui, totalSemaine: documentsSemaine },
        notificationsStats: { etudiantsANotifier, enseignantsANotifier },
        recentActivity: formattedRecentActivity,
        activityLast14Days,
        demandesByStatus,
        sessionsNext7Days,
      },
    });
  } catch (error) {
    console.error('[Scolarité Dashboard] Failed to fetch stats:', error);
    return res.status(500).json({ success: false, message: 'Une erreur est survenue lors de la récupération des statistiques.' });
  }
};

// ─── RÉCUPÉRATION DES FILIÈRES ───
const getFilieres = async (req, res) => {
  try {
    const filieres = await prisma.filiere.findMany({
      select: { id_filiere: true, nom: true, code: true },
      orderBy: { nom: 'asc' }
    });
    return res.status(200).json({ success: true, data: filieres });
  } catch (error) {
    console.error('[Scolarité] Failed to fetch filieres:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des filières.' });
  }
};

// ─── RECHERCHE AVANCÉE (Correction Prisma "is" pour les relations) ───
const getUtilisateursPourNotification = async (req, res) => {
  try {
    const { role, search, searchType } = req.query;

    const where = {
      actif: true,
      role: role === 'PROFESSOR'
        ? { nom_role: { in: ['PROFESSOR', 'PROFESSEUR'] } }
        : { nom_role: role || 'ETUDIANT' },
    };

    if (search && search.trim() !== '') {
      if (searchType === 'cne') {
        // En Prisma, on utilise `is` pour filtrer à travers une relation 1-to-1 ou optionnelle
        where.etudiant = { is: { cne: { contains: search, mode: 'insensitive' } } };
      } else if (searchType === 'matricule') {
        where.employe = { is: { matricule: { contains: search, mode: 'insensitive' } } };
      } else if (searchType === 'email') {
        where.email = { contains: search, mode: 'insensitive' };
      } else if (searchType === 'nom') {
        where.OR = [
          { nom: { contains: search, mode: 'insensitive' } },
          { prenom: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        // Fallback global
        where.OR = [
          { nom: { contains: search, mode: 'insensitive' } },
          { prenom: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { etudiant: { is: { cne: { contains: search, mode: 'insensitive' } } } },
          { employe: { is: { matricule: { contains: search, mode: 'insensitive' } } } }
        ];
      }
    }

    const users = await prisma.utilisateur.findMany({
      where,
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        role: { select: { nom_role: true } },
        etudiant: { select: { cne: true, filiere: { select: { nom: true } } } },
        employe: { select: { matricule: true } }
      },
      orderBy: { nom: 'asc' },
      take: 100, // Prends 100 résultats (soit les 100 premiers si aucune recherche, soit 100 filtrés)
    });

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('[Scolarité] Failed to fetch utilisateurs:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des utilisateurs.' });
  }
};

// ─── ENVOI DES NOTIFICATIONS ET EMAILS AVEC PIÈCES JOINTES ───
const sendNotification = async (req, res) => {
  try {
    const titre = req.body.titre;
    const message = req.body.message;
    const type = req.body.type || 'Info';
    const priorite = req.body.priorite || 'Info';
    const cible = req.body.cible;
    const sendEmail = req.body.sendEmail === 'true' || req.body.sendEmail === true;
    
    const userIds = req.body.userIds ? JSON.parse(req.body.userIds) : [];
    const filiereIds = req.body.filiereIds ? JSON.parse(req.body.filiereIds) : [];
    const files = req.files || [];

    if (!titre || !message) {
      return res.status(400).json({ success: false, message: 'Titre et message requis.' });
    }

    let whereClause = { actif: true };

    if (cible === 'specifique' && userIds.length > 0) {
      whereClause.id_utilisateur = { in: userIds };
    } else if (cible === 'filieres' && filiereIds.length > 0) {
      whereClause.role = { nom_role: 'ETUDIANT' };
      whereClause.etudiant = { id_filiere: { in: filiereIds } };
    } else if (cible === 'etudiants') {
      whereClause.role = { nom_role: 'ETUDIANT' };
    } else if (cible === 'enseignants') {
      whereClause.role = { nom_role: { in: ['PROFESSOR', 'PROFESSEUR'] } };
    } else {
      return res.status(400).json({ success: false, message: 'Cible invalide ou manquante.' });
    }

    const users = await prisma.utilisateur.findMany({
      where: whereClause,
      select: { id_utilisateur: true, email: true }
    });

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Aucun destinataire trouvé.' });
    }

    await prisma.notification.createMany({
      data: users.map((u) => ({
        id_utilisateur: u.id_utilisateur,
        titre,
        message,
        type,
        priorite,
      })),
    });

    let emailSentCount = 0;
    if (sendEmail) {
      const validEmails = users.map(u => u.email).filter(Boolean);

      if (validEmails.length > 0) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true', 
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailAttachments = files.map(file => ({
          filename: file.originalname,
          path: file.path
        }));

        const mailOptions = {
          from: process.env.SMTP_FROM || '"Service Scolarité" <no-reply@smartcampus.com>',
          bcc: validEmails,
          subject: titre,
          text: message,
          html: `<div style="font-family: Arial, sans-serif; color: #333;">
                  <h2>${titre}</h2>
                  <p style="white-space: pre-line;">${message}</p>
                  <hr style="margin-top: 20px; border: none; border-top: 1px solid #eaeaea;" />
                  <p style="font-size: 12px; color: #888;">Ceci est un message automatique envoyé depuis le portail SmartCampus. Ne pas répondre.</p>
                 </div>`,
          attachments: mailAttachments
        };

        try {
          await transporter.sendMail(mailOptions);
          emailSentCount = validEmails.length;
        } catch (emailErr) {
          console.error('[Scolarité] Erreur d\'envoi email:', emailErr);
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      countApp: users.length, 
      countEmail: emailSentCount,
      message: 'Notifications envoyées avec succès.' 
    });

  } catch (error) {
    console.error('[Scolarité] Failed to send notification:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de la notification.' });
  }
};

module.exports = { 
  getDashboardStats, 
  getUtilisateursPourNotification, 
  getFilieres, 
  sendNotification 
};