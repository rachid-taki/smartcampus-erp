require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Récupère l'ID de l'enseignant depuis le token (middleware d'authentification)
const getTeacherId = (req) => req.user.id_utilisateur || req.user.id;

// Utilitaire pour convertir une heure 'HH:MM' string en objet Date pour Prisma (@db.Time)
const timeStringToDate = (timeStr) => {
  if (!timeStr) return undefined;
  return new Date(`1970-01-01T${timeStr}:00Z`);
};


/**
 * GET /api/enseignant/seances/upcoming
 * Liste TOUTES les sessions de l'enseignant connecté (passées, futures, annulées)
 * et met à jour automatiquement le statut des séances planifiées dont l'heure de fin est dépassée.
 */
const getUpcomingSessions = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const now = new Date();

    // 1. Trouver toutes les séances encore planifiées
    const sessionsPlanifiees = await prisma.sessionSalle.findMany({
      where: { 
        id_professeur: teacherId, 
        statut: 'Planifiee' 
      }
    });

    const idsToUpdate = [];

    for (const s of sessionsPlanifiees) {
      // Créer une vraie date de fin en fusionnant 'date' et 'heure_fin'
      const sessionEnd = new Date(s.date);
      if (s.heure_fin) {
        sessionEnd.setHours(s.heure_fin.getHours(), s.heure_fin.getMinutes(), 0, 0);
      }
      
      // Si la date/heure actuelle a dépassé la fin de la séance
      if (sessionEnd < now) {
        idsToUpdate.push(s.id_session);
      }
    }

    // 2. Mettre à jour automatiquement les séances passées en "Terminee"
    if (idsToUpdate.length > 0) {
      await prisma.sessionSalle.updateMany({
        where: { id_session: { in: idsToUpdate } },
        data: { statut: 'Terminee' }
      });
    }

    // 3. Récupérer TOUTES les séances (sans restriction de date) pour le Frontend
    const seances = await prisma.sessionSalle.findMany({
      where: {
        id_professeur: teacherId,
      },
      include: {
        cours: true,
        filiere: true,
        salle: true
      },
      orderBy: [
        { date: 'desc' }, // Tri décroissant pour avoir les plus récentes d'abord
        { heure_debut: 'desc' }
      ]
    });

    // 4. Formater les données pour correspondre à la structure attendue par le Frontend
    const formattedSeances = seances.map(s => {
      // Sécurisation de l'extraction de l'heure
      const heureDebutStr = s.heure_debut instanceof Date ? s.heure_debut.toISOString().substring(11, 16) : '';
      const heureFinStr = s.heure_fin instanceof Date ? s.heure_fin.toISOString().substring(11, 16) : '';

      return {
        id_seance: s.id_session,
        date_seance: s.date,
        heure_debut: heureDebutStr,
        heure_fin: heureFinStr,
        type_seance: "CM", // Par défaut (absent du modèle SessionSalle)
        statut: s.statut,
        element_module: {
          id_element: s.id_cours,
          nom_element: s.cours?.nom || 'Cours Inconnu',
          module: {
            filiere: {
              nom_filiere: s.filiere?.nom || s.filiere?.nom_filiere || 'Filière Inconnue'
            }
          }
        },
        salle: s.salle
      };
    });

    res.status(200).json({ success: true, data: formattedSeances });
  } catch (error) {
    console.error("[Enseignant] Erreur getUpcomingSessions:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des séances." });
  }
};

/**
 * PUT /api/enseignant/seances/:id
 * Modifie les informations d'une session existante.
 */
const updateSession = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { id } = req.params;
    const { date_seance, heure_debut, heure_fin, statut } = req.body;

    // Vérifier l'appartenance
    const existing = await prisma.sessionSalle.findFirst({
      where: { id_session: id, id_professeur: teacherId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Séance introuvable ou accès non autorisé." });
    }

    const updatedSeance = await prisma.sessionSalle.update({
      where: { id_session: id },
      data: {
        date: date_seance ? new Date(date_seance) : undefined,
        heure_debut: timeStringToDate(heure_debut),
        heure_fin: timeStringToDate(heure_fin),
        statut
      }
    });

    res.status(200).json({ success: true, message: "Séance modifiée avec succès.", data: updatedSeance });
  } catch (error) {
    console.error("[Enseignant] Erreur updateSession:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la modification de la séance." });
  }
};

/**
 * POST /api/enseignant/seances/resolve-conflicts
 */
const resolveConflicts = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { kept_seance_id, deleted_seance_ids } = req.body;

    if (!kept_seance_id || !Array.isArray(deleted_seance_ids) || deleted_seance_ids.length === 0) {
      return res.status(400).json({ success: false, message: "Paramètres invalides." });
    }

    // Sécurité : S'assurer que toutes les sessions à supprimer appartiennent bien à ce professeur
    const deleteResult = await prisma.sessionSalle.deleteMany({
      where: {
        id_session: { in: deleted_seance_ids },
        id_professeur: teacherId 
      }
    });

    res.status(200).json({ 
      success: true, 
      message: `${deleteResult.count} séance(s) conflictuelle(s) supprimée(s).`,
      kept_id: kept_seance_id
    });
  } catch (error) {
    console.error("[Enseignant] Erreur resolveConflicts:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la résolution des conflits." });
  }
};

/**
 * DELETE /api/enseignant/seances/end-course
 */
const endCourseEarly = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { id_element, end_date } = req.body;

    if (!id_element || !end_date) {
      return res.status(400).json({ success: false, message: "Le cours (id_element) et la date de fin sont requis." });
    }

    const deleteResult = await prisma.sessionSalle.deleteMany({
      where: {
        id_professeur: teacherId,
        id_cours: id_element, // Dans le frontend, l'id_element qu'on a passé correspond au id_cours
        date: { gt: new Date(end_date) }
      }
    });

    res.status(200).json({ 
      success: true, 
      message: `Cours clôturé au ${new Date(end_date).toLocaleDateString()}. ${deleteResult.count} séance(s) ultérieure(s) annulée(s).` 
    });
  } catch (error) {
    console.error("[Enseignant] Erreur endCourseEarly:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la clôture du cours." });
  }
};

/**
 * GET /api/enseignant/communications/context
 */
const getCommunicationContext = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);

    // Trouver les filières dans lesquelles ce professeur enseigne
    const seances = await prisma.sessionSalle.findMany({
      where: { id_professeur: teacherId },
      include: { filiere: true }
    });

    // Extraire les filières uniques
    const filieresMap = new Map();
    seances.forEach(s => {
      const filiere = s.filiere;
      if (filiere && !filieresMap.has(filiere.id_filiere)) {
        filieresMap.set(filiere.id_filiere, filiere);
      }
    });
    const filieres = Array.from(filieresMap.values());
    const filiereIds = filieres.map(f => f.id_filiere);

    // Récupérer les étudiants inscrits dans ces filières
    const etudiants = await prisma.etudiant.findMany({
      where: { id_filiere: { in: filiereIds } },
      include: { utilisateur: { select: { nom: true, prenom: true, email: true } } }
    });

    res.status(200).json({ success: true, data: { filieres, etudiants } });
  } catch (error) {
    console.error("[Enseignant] Erreur getCommunicationContext:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération du contexte." });
  }
};

/**
 * POST /api/enseignant/communications/notify
 */
const notifyStudents = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { target_type, target_ids, titre, message } = req.body; 

    if (!target_type || !target_ids || !Array.isArray(target_ids) || target_ids.length === 0) {
      return res.status(400).json({ success: false, message: "Destinataires invalides." });
    }

    // 1. Récupérer les infos de l'enseignant pour la signature
    const teacher = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: teacherId }
    });
    const teacherName = `Pr. ${teacher.nom}`;
    const dynamicTitle = `[${teacherName}] ${titre}`;

    // 2. Déterminer les IDs des utilisateurs à notifier
    let userIdsToNotify = [];

    if (target_type === 'FILIERES') {
      const etudiants = await prisma.etudiant.findMany({
        where: { id_filiere: { in: target_ids } },
        select: { id_utilisateur: true }
      });
      userIdsToNotify = etudiants.map(e => e.id_utilisateur);
    } else if (target_type === 'ETUDIANTS') {
      const etudiants = await prisma.etudiant.findMany({
        where: { id_etudiant: { in: target_ids } },
        select: { id_utilisateur: true }
      });
      userIdsToNotify = etudiants.map(e => e.id_utilisateur);
    }

    if (userIdsToNotify.length === 0) {
      return res.status(404).json({ success: false, message: "Aucun étudiant trouvé pour ces critères." });
    }

    // 3. Créer les notifications In-App
    const notificationsData = userIdsToNotify.map(id => ({
      id_utilisateur: id,
      titre: dynamicTitle,
      message: message,
      type: "Info", // <-- Sécurisé pour ne pas provoquer d'erreur Prisma
      lu: false,
      priorite: "Info"
    }));

    await prisma.notification.createMany({
      data: notificationsData,
      skipDuplicates: true
    });

    res.status(200).json({ 
      success: true, 
      message: `Notification envoyée avec succès à ${userIdsToNotify.length} étudiant(s).` 
    });
  } catch (error) {
    console.error("[Enseignant] Erreur notifyStudents:", error);
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi de la notification." });
  }
};

/**
 * GET /api/enseignant/seances/plan-context
 * Récupère les cours/filières associés à l'enseignant et filtre les salles disponibles.
 */
const getPlanContext = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { date, heure_debut, heure_fin } = req.query;

    // 1. Récupérer les séances existantes du professeur pour mapper ses cours avec leurs filières
    const teacherSessions = await prisma.sessionSalle.findMany({
      where: { 
        id_professeur: teacherId,
        id_filiere: { not: null }
      },
      include: {
        cours: true,
        filiere: true
      }
    });

    // 2. Récupérer également ses cours assignés via la table cours_professeur
    const coursProf = await prisma.coursProfesseur.findMany({
      where: { id_professeur: teacherId },
      include: { cours: true }
    });

    // Construire une liste unique de combinaisons Filière/Cours valides
    const filiereCoursMap = new Map();

    teacherSessions.forEach((s) => {
      if (s.cours && s.filiere) {
        const key = `${s.id_filiere}_${s.id_cours}`;
        if (!filiereCoursMap.has(key)) {
          filiereCoursMap.set(key, {
            id_filiere: s.id_filiere,
            nom_filiere: s.filiere.nom || s.filiere.nom_filiere,
            id_cours: s.id_cours,
            nom_cours: s.cours.nom,
            code_cours: s.cours.code,
            label: `${s.filiere.nom || s.filiere.nom_filiere} — ${s.cours.nom} (${s.cours.code})`
          });
        }
      }
    });

    // Si aucune séance passée avec filière, lier ses cours assignés à toutes les filières disponibles par défaut
    if (filiereCoursMap.size === 0) {
      const allFilieres = await prisma.filiere.findMany();
      coursProf.forEach((cp) => {
        allFilieres.forEach((f) => {
          const key = `${f.id_filiere}_${cp.id_cours}`;
          if (!filiereCoursMap.has(key)) {
            filiereCoursMap.set(key, {
              id_filiere: f.id_filiere,
              nom_filiere: f.nom || f.nom_filiere,
              id_cours: cp.id_cours,
              nom_cours: cp.cours.nom,
              code_cours: cp.cours.code,
              label: `${f.nom || f.nom_filiere} — ${cp.cours.nom} (${cp.cours.code})`
            });
          }
        });
      });
    }

    const availableAssignments = Array.from(filiereCoursMap.values());

    // 3. Filtrage dynamique des salles disponibles
    let salles = [];
    if (date && heure_debut && heure_fin) {
      const targetDate = new Date(date);
      const startTime = timeStringToDate(heure_debut);
      const endTime = timeStringToDate(heure_fin);

      const occupiedSessions = await prisma.sessionSalle.findMany({
        where: {
          date: targetDate,
          statut: { not: 'Annulee' },
          AND: [
            { heure_debut: { lt: endTime } },
            { heure_fin: { gt: startTime } }
          ]
        },
        select: { id_salle: true }
      });

      const occupiedReservations = await prisma.reservationSalle.findMany({
        where: {
          date: targetDate,
          statut: 'Approuvee',
          AND: [
            { heure_debut: { lt: endTime } },
            { heure_fin: { gt: startTime } }
          ]
        },
        select: { id_salle: true }
      });

      const busyRoomIds = [
        ...occupiedSessions.map(s => s.id_salle),
        ...occupiedReservations.map(r => r.id_salle)
      ];

      salles = await prisma.salle.findMany({
        where: {
          statut: 'Disponible',
          id_salle: { notIn: busyRoomIds }
        }
      });
    }

    res.status(200).json({ 
      success: true, 
      data: { assignments: availableAssignments, salles } 
    });
  } catch (error) {
    console.error("[Enseignant] Erreur getPlanContext:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des données de planification." });
  }
};

/**
 * POST /api/enseignant/seances
 * Crée une nouvelle séance.
 */
const createSession = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { id_cours, id_filiere, id_salle, date, heure_debut, heure_fin, type_seance } = req.body;

    if (!id_cours || !id_salle || !date || !heure_debut || !heure_fin) {
      return res.status(400).json({ success: false, message: "Veuillez remplir tous les champs obligatoires." });
    }

    const nouvelleSeance = await prisma.sessionSalle.create({
      data: {
        id_professeur: teacherId,
        id_cours,
        id_filiere: id_filiere || null,
        id_salle,
        date: new Date(date),
        heure_debut: timeStringToDate(heure_debut),
        heure_fin: timeStringToDate(heure_fin),
        statut: 'Planifiee'
      }
    });

    res.status(201).json({ success: true, message: "Séance planifiée avec succès.", data: nouvelleSeance });
  } catch (error) {
    console.error("[Enseignant] Erreur createSession:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la planification de la séance." });
  }
};

module.exports = {
  getUpcomingSessions,
  updateSession,
  resolveConflicts,
  endCourseEarly,
  getCommunicationContext,
  notifyStudents,
  getPlanContext,
  createSession
};