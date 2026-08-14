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

const VALID_STATUTS = [
  'Demandee',
  'Acceptee',
  'Rejetee',
  'Planifiee',
  'Consultee',
  'Cloturee',
];

// Shared include shape used across both endpoints. Per spec, CNE lives
// on `etudiant` directly (etudiant.cne), NOT under utilisateur — so we
// deliberately don't select it here; the caller can read `etudiant.cne`
// straight off the returned object.
const CONSULTATION_INCLUDE = {
  etudiant: {
    include: {
      utilisateur: {
        select: { nom: true, prenom: true },
      },
    },
  },
};

/**
 * Safely parse a time string (e.g. "10:30", "10:30:00") into a valid
 * DateTime for a Prisma `@db.Time` field. Prisma/Postgres TIME columns
 * are represented as DateTime values anchored to an arbitrary base date
 * (1970-01-01) — only the time-of-day portion is actually persisted.
 *
 * Accepts:
 *   - "HH:mm"       (e.g. "10:30")
 *   - "HH:mm:ss"    (e.g. "10:30:00")
 *   - A full ISO datetime string (passed through as-is if already valid)
 *
 * @param {string} value
 * @returns {Date|null} a valid Date object, or null if unparseable
 */
const parseHeurePlanification = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();

  // Case 1: plain time string "HH:mm" or "HH:mm:ss"
  const timeMatch = trimmed.match(/^(\d{2}):(\d{2})(:(\d{2}))?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = timeMatch[4] ? Number(timeMatch[4]) : 0;

    if (hours > 23 || minutes > 59 || seconds > 59) return null;

    // Anchor to an arbitrary fixed date — only the time-of-day matters
    // for a @db.Time column; Prisma/Postgres will ignore the date part.
    const anchored = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
    return Number.isNaN(anchored.getTime()) ? null : anchored;
  }

  // Case 2: already a full ISO datetime string — validate and pass through
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Safely parse a date-only string (e.g. "2026-03-15") into a Date for
 * a Prisma `@db.Date` field.
 *
 * @param {string} value
 * @returns {Date|null}
 */
const parseDatePlanification = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * GET /api/enseignant/consultations
 *
 * Fetch all exam consultation requests, including the requesting
 * student's identity (nom, prenom via utilisateur; cne directly on
 * etudiant), ordered by date_demande descending (most recent first).
 *
 * Query params (optional):
 *   - statut (filter by consultation status)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getConsultations = async (req, res) => {
  try {
    const { statut } = req.query;

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
 *
 * Schedule (or update the status of) an exam consultation request.
 *
 * URL params:
 *   - id: id_verification (UUID)
 *
 * Body:
 *   - statut               (required) one of Demandee | Acceptee | Rejetee |
 *                           Planifiee | Consultee | Cloturee
 *   - date_planification    (optional) date string, e.g. "2026-03-15"
 *   - heure_planification   (optional) time string, e.g. "10:30" or "10:30:00"
 *   - salle_planification   (optional) room name/number
 *   - commentaires_prof     (optional) teacher's notes
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const planifierConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      statut,
      date_planification,
      heure_planification,
      salle_planification,
      commentaires_prof,
    } = req.body;

    // --- Validate the id param before hitting the database ---
    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    // --- Validate statut ---
    if (!statut) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "statut" est requis.',
      });
    }

    if (!VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
      });
    }

    // --- Verify the consultation exists before attempting the update ---
    const existingConsultation = await prisma.verificationExam.findUnique({
      where: { id_verification: id },
    });

    if (!existingConsultation) {
      return res.status(404).json({
        success: false,
        message: `Aucune consultation trouvée avec l'id "${id}".`,
      });
    }

    // --- Build the update payload, parsing date/time safely ---
    const updateData = { statut };

    if (date_planification !== undefined) {
      if (date_planification === null || date_planification === '') {
        updateData.date_planification = null;
      } else {
        const parsedDate = parseDatePlanification(date_planification);
        if (!parsedDate) {
          return res.status(400).json({
            success: false,
            message: `"date_planification" n'est pas une date valide: "${date_planification}".`,
          });
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
          return res.status(400).json({
            success: false,
            message: `"heure_planification" n'est pas une heure valide: "${heure_planification}". Format attendu: "HH:mm" ou "HH:mm:ss".`,
          });
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
    // Prisma P2025 = record to update not found (race condition:
    // deleted between the findUnique check and the update call)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'La consultation est introuvable ou a déjà été supprimée.',
      });
    }

    console.error('[Enseignant Consultations] Failed to schedule consultation:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la planification de la consultation.',
    });
  }
};

module.exports = {
  getConsultations,
  planifierConsultation,
};