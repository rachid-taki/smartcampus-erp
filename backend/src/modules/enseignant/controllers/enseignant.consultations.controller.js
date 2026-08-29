require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUTS = [
  'Demandee',
  'Acceptee',
  'Rejetee',
  'Planifiee',
  'Consultee',
  'Cloturee',
];

// Helper pour récupérer l'ID de l'enseignant depuis le token
const getTeacherId = (req) => req.user?.id_utilisateur || req.user?.id;

const CONSULTATION_INCLUDE = {
  etudiant: {
    include: {
      utilisateur: {
        select: { nom: true, prenom: true },
      },
    },
  },
};

const parseHeurePlanification = (value) => {
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

const parseDatePlanification = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * GET /api/enseignant/consultations
 * Récupère les consultations assignées à l'enseignant connecté
 */
const getConsultations = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { statut } = req.query;

    const where = {
      id_professeur: teacherId // SÉCURITÉ : Filtre par le professeur connecté
    };

    if (statut) {
      if (!VALID_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
        });
      }
      where.statut = statut;
    }

    const consultations = await prisma.verificationExam.findMany({
      where,
      include: CONSULTATION_INCLUDE,
      orderBy: { date_demande: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: consultations.length,
      data: consultations,
    });
  } catch (error) {
    console.error('[Enseignant Consultations] Failed to fetch consultations:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des consultations.',
    });
  }
};

/**
 * PUT /api/enseignant/consultations/:id/planifier
 */
const planifierConsultation = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const { id } = req.params;
    const {
      statut,
      date_planification,
      heure_planification,
      salle_planification,
      commentaires_prof,
    } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    if (!statut) {
      return res.status(400).json({ success: false, message: 'Le champ "statut" est requis.' });
    }

    if (!VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
      });
    }

    // Vérifier que la consultation existe ET appartient au professeur
    const existingConsultation = await prisma.verificationExam.findUnique({
      where: { id_verification: id },
    });

    if (!existingConsultation) {
      return res.status(404).json({ success: false, message: `Aucune consultation trouvée.` });
    }

    if (existingConsultation.id_professeur !== teacherId) {
      return res.status(403).json({ success: false, message: `Accès non autorisé à cette consultation.` });
    }

    const updateData = { statut };

    if (date_planification !== undefined) {
      if (date_planification === null || date_planification === '') {
        updateData.date_planification = null;
      } else {
        const parsedDate = parseDatePlanification(date_planification);
        if (!parsedDate) {
          return res.status(400).json({ success: false, message: `"date_planification" invalide.` });
        }
        updateData.date_planification = parsedDate;
      }
    }

    if (heure_planification !== undefined) {
      if (heure_planification === null || heure_planification === '') {
        updateData.heure_planification = null;
      } else {
        const parsedTime = parseHeurePlanification(heure_planification);
        if (!parsedTime) {
          return res.status(400).json({ success: false, message: `"heure_planification" invalide.` });
        }
        updateData.heure_planification = parsedTime;
      }
    }

    if (salle_planification !== undefined) {
      updateData.salle_planification = salle_planification || null;
    }

    if (commentaires_prof !== undefined) {
      updateData.commentaires_prof = commentaires_prof || null;
    }

    const updatedConsultation = await prisma.verificationExam.update({
      where: { id_verification: id },
      data: updateData,
      include: CONSULTATION_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: 'Consultation mise à jour avec succès.',
      data: updatedConsultation,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'La consultation est introuvable ou a déjà été supprimée.' });
    }
    console.error('[Enseignant Consultations] Failed to schedule consultation:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la planification.' });
  }
};

module.exports = {
  getConsultations,
  planifierConsultation,
};