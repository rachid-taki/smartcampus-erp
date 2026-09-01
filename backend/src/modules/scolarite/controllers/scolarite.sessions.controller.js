require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUTS = ['Planifiee', 'En_Cours', 'Terminee', 'Annulee'];

/**
 * Safely parse a "YYYY-MM-DD" date string into a Date object.
 */
const parseDateOnly = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Safely parse a time string ("HH:mm" or "HH:mm:ss") into a valid DateTime
 */
const parseTimeOnly = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  const timeMatch = trimmed.match(/^(\d{2}):(\d{2})(:(\d{2}))?$/);

  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = timeMatch[4] ? Number(timeMatch[4]) : 0;

    if (hours > 23 || minutes > 59 || seconds > 59) return null;

    const anchored = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
    return Number.isNaN(anchored.getTime()) ? null : anchored;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const SESSION_INCLUDE = {
  salle: {
    select: { numero: true, nom: true, capacite: true },
  },
  cours: {
    select: { nom: true, code: true },
  },
  professeur: {
    include: {
      employe: {
        include: {
          utilisateur: {
            select: { nom: true, prenom: true },
          },
        },
      },
    },
  },
  filiere: {
    select: { nom: true, code: true },
  },
};

/**
 * GET /api/sessions
 */
const getSessions = async (req, res) => {
  try {
    const { statut, id_salle, date, id_filiere } = req.query;
    const where = {};

    if (statut) {
      if (!VALID_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
        });
      }
      where.statut = statut;
    }

    if (id_salle) {
      if (!UUID_REGEX.test(id_salle)) {
        return res.status(400).json({
          success: false,
          message: `L'identifiant de salle fourni ("${id_salle}") n'est pas un UUID valide.`,
        });
      }
      where.id_salle = id_salle;
    }

    if (id_filiere) {
      if (id_filiere === 'none') {
        where.id_filiere = null; // Filtre les sessions non-assignées
      } else if (id_filiere !== 'all') {
        if (!UUID_REGEX.test(id_filiere)) {
          return res.status(400).json({ success: false, message: `UUID filière invalide.` });
        }
        where.id_filiere = id_filiere;
      }
    }

    if (date) {
      const parsedDate = parseDateOnly(date);
      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: `"date" n'est pas une date valide: "${date}".`,
        });
      }
      const startOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
      const endOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate() + 1));
      where.date = { gte: startOfDay, lt: endOfDay };
    }

    const sessions = await prisma.sessionSalle.findMany({
      where,
      include: SESSION_INCLUDE,
      orderBy: [{ date: 'desc' }, { heure_debut: 'desc' }],
    });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error('[Sessions Salle] Failed to fetch sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des sessions.',
    });
  }
};

/**
 * POST /api/sessions
 */
const createSession = async (req, res) => {
  try {
    const { id_salle, id_cours, id_professeur, id_filiere, date, heure_debut, heure_fin } = req.body;

    if (!id_salle || !UUID_REGEX.test(id_salle)) {
      return res.status(400).json({ success: false, message: 'Le champ "id_salle" est requis et doit être un UUID valide.' });
    }
    if (!id_cours || !UUID_REGEX.test(id_cours)) {
      return res.status(400).json({ success: false, message: 'Le champ "id_cours" est requis et doit être un UUID valide.' });
    }
    if (!id_professeur || !UUID_REGEX.test(id_professeur)) {
      return res.status(400).json({ success: false, message: 'Le champ "id_professeur" est requis et doit être un UUID valide.' });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'Le champ "date" est requis.' });
    }
    const parsedDate = parseDateOnly(date);
    if (!parsedDate) {
      return res.status(400).json({ success: false, message: `"date" n'est pas une date valide: "${date}".` });
    }
    if (!heure_debut) {
      return res.status(400).json({ success: false, message: 'Le champ "heure_debut" est requis.' });
    }
    const parsedHeureDebut = parseTimeOnly(heure_debut);
    if (!parsedHeureDebut) {
      return res.status(400).json({ success: false, message: `"heure_debut" n'est pas une heure valide: "${heure_debut}". Format attendu: "HH:mm".` });
    }
    if (!heure_fin) {
      return res.status(400).json({ success: false, message: 'Le champ "heure_fin" est requis.' });
    }
    const parsedHeureFin = parseTimeOnly(heure_fin);
    if (!parsedHeureFin) {
      return res.status(400).json({ success: false, message: `"heure_fin" n'est pas une heure valide: "${heure_fin}". Format attendu: "HH:mm".` });
    }

    if (parsedHeureFin <= parsedHeureDebut) {
      return res.status(400).json({ success: false, message: '"heure_fin" doit être postérieure à "heure_debut".' });
    }

    // Création de la session
    const newSession = await prisma.sessionSalle.create({
      data: {
        id_salle,
        id_cours,
        id_professeur,
        id_filiere: id_filiere || null, // Relie la filière si fournie
        date: parsedDate,
        heure_debut: parsedHeureDebut,
        heure_fin: parsedHeureFin,
        statut: 'Planifiee',
      },
      include: SESSION_INCLUDE,
    });

    // ─────────────────────────────────────────────────────────────
    // GESTION DES NOTIFICATIONS (ENSEIGNANT ET ÉTUDIANTS)
    // ─────────────────────────────────────────────────────────────
    try {
      const dateStr = parsedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const coursNom = newSession.cours?.nom || 'Cours non spécifié';
      const salleNum = newSession.salle?.numero || 'Salle non spécifiée';

      // 1. Notification personnalisée pour l'ENSEIGNANT
      await prisma.notification.create({
        data: {
          id_utilisateur: id_professeur,
          titre: `Nouvelle session assignée : ${coursNom}`,
          message: `Bonjour, une nouvelle session de cours vous a été assignée.\n\n📚 Cours : ${coursNom}\n📅 Date : ${dateStr}\n⏱ Horaires : de ${heure_debut} à ${heure_fin}\n📍 Salle : ${salleNum}\n\nMerci de prendre vos dispositions pour assurer ce cours.`,
          type: 'Calendrier',
          priorite: 'Info',
        },
      });

      // 2. Notifications personnalisées pour les ÉTUDIANTS (si une filière est sélectionnée)
      if (id_filiere) {
        const etudiants = await prisma.etudiant.findMany({
          where: { id_filiere: id_filiere, statut: 'Actif' },
          select: { id_etudiant: true },
        });

        if (etudiants.length > 0) {
          const notificationsEtudiants = etudiants.map((etu) => ({
            id_utilisateur: etu.id_etudiant,
            titre: `Nouvelle session planifiée : ${coursNom}`,
            message: `Une nouvelle session a été ajoutée à votre emploi du temps.\n\n📚 Module : ${coursNom}\n📅 Date : ${dateStr}\n⏱ Horaires : de ${heure_debut} à ${heure_fin}\n📍 Salle : ${salleNum}\n\nVotre présence est requise.`,
            type: 'Calendrier',
            priorite: 'Info',
          }));

          await prisma.notification.createMany({
            data: notificationsEtudiants,
          });
        }
      }
    } catch (notifError) {
      console.error('[Sessions Salle] Erreur lors de l\'envoi des notifications:', notifError);
    }

    return res.status(201).json({
      success: true,
      message: 'Session créée et notifications envoyées avec succès.',
      data: newSession,
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez que "id_salle", "id_cours", "id_filiere" et "id_professeur" correspondent à des enregistrements existants.',
      });
    }
    console.error('[Sessions Salle] Failed to create session:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la création de la session.',
    });
  }
};

/**
 * PUT /api/sessions/:id/statut
 */
const updateSessionStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, heure_debut_reelle, heure_fin_reelle, nombre_etudiants } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.` });
    }
    if (!statut) {
      return res.status(400).json({ success: false, message: 'Le champ "statut" est requis.' });
    }
    if (!VALID_STATUTS.includes(statut)) {
      return res.status(400).json({ success: false, message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.` });
    }

    const existingSession = await prisma.sessionSalle.findUnique({ where: { id_session: id } });
    if (!existingSession) {
      return res.status(404).json({ success: false, message: `Aucune session trouvée avec l'id "${id}".` });
    }

    const updateData = { statut };

    if (heure_debut_reelle !== undefined) {
      if (heure_debut_reelle === null || heure_debut_reelle === '') {
        updateData.heure_debut_reelle = null;
      } else {
        const parsed = parseTimeOnly(heure_debut_reelle);
        if (!parsed) {
          return res.status(400).json({ success: false, message: `"heure_debut_reelle" n'est pas une heure valide.` });
        }
        updateData.heure_debut_reelle = parsed;
      }
    }

    if (heure_fin_reelle !== undefined) {
      if (heure_fin_reelle === null || heure_fin_reelle === '') {
        updateData.heure_fin_reelle = null;
      } else {
        const parsed = parseTimeOnly(heure_fin_reelle);
        if (!parsed) {
          return res.status(400).json({ success: false, message: `"heure_fin_reelle" n'est pas une heure valide.` });
        }
        updateData.heure_fin_reelle = parsed;
      }
    }

    if (nombre_etudiants !== undefined) {
      if (nombre_etudiants === null || nombre_etudiants === '') {
        updateData.nombre_etudiants = null;
      } else {
        const parsedCount = Number(nombre_etudiants);
        if (!Number.isInteger(parsedCount) || parsedCount < 0) {
          return res.status(400).json({ success: false, message: 'Le champ "nombre_etudiants" doit être un entier positif ou nul.' });
        }
        updateData.nombre_etudiants = parsedCount;
      }
    }

    const effectiveHeureDebutReelle = updateData.heure_debut_reelle !== undefined ? updateData.heure_debut_reelle : existingSession.heure_debut_reelle;

    if (effectiveHeureDebutReelle && existingSession.heure_debut) {
      const scheduledMs = new Date(existingSession.heure_debut).getTime();
      const actualMs = new Date(effectiveHeureDebutReelle).getTime();
      const diffMinutes = Math.round((actualMs - scheduledMs) / 60000);
      updateData.retard_moyen = diffMinutes > 0 ? diffMinutes : 0;
    }

    const updatedSession = await prisma.sessionSalle.update({
      where: { id_session: id },
      data: updateData,
      include: SESSION_INCLUDE,
    });

    return res.status(200).json({ success: true, message: 'Statut de la session mis à jour.', data: updatedSession });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'La session est introuvable ou a déjà été supprimée.' });
    }
    return res.status(500).json({ success: false, message: 'Une erreur est survenue lors de la mise à jour.' });
  }
};

/**
 * GET /api/cours
 */
const getCours = async (req, res) => {
  try {
    const coursList = await prisma.cours.findMany({
      select: { id_cours: true, nom: true, code: true },
      orderBy: { nom: 'asc' }
    });
    return res.status(200).json({ success: true, data: coursList });
  } catch (error) {
    console.error('[Sessions Salle] Failed to fetch cours:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des cours.' });
  }
};

/**
 * GET /api/professeurs
 */
const getProfesseurs = async (req, res) => {
  try {
    const professeursList = await prisma.professeur.findMany({
      include: {
        employe: {
          include: {
            utilisateur: {
              select: { nom: true, prenom: true }
            }
          }
        }
      }
    });
    return res.status(200).json({ success: true, data: professeursList });
  } catch (error) {
    console.error('[Sessions Salle] Failed to fetch professeurs:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des professeurs.' });
  }
};

module.exports = {
  getSessions,
  createSession,
  updateSessionStatut,
  getCours,
  getProfesseurs,
};