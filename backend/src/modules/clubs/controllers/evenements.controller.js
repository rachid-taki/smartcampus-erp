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

const VALID_TYPES = [
  'Evenement',
  'Salle',
  'Materiel',
  'Budget',
  'Communication',
  'Sponsoring',
];

const VALID_STATUTS = ['Soumise', 'En_Revue', 'Approuvee', 'Rejetee'];

// Shared include shape used across GET (list), GET (single), POST, and
// PUT so the response structure stays identical everywhere.
const DEMANDE_CLUB_INCLUDE = {
  club: {
    select: { nom: true },
  },
  president: {
    include: {
      etudiant: {
        include: {
          utilisateur: {
            select: { nom: true, prenom: true },
          },
        },
      },
    },
  },
};

/**
 * Safely parse a "YYYY-MM-DD" date string into a Date object.
 *
 * @param {string} value
 * @returns {Date|null}
 */
const parseDateOnly = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Safely parse a time string ("HH:mm" or "HH:mm:ss") into a valid
 * DateTime for a Prisma `@db.Time` field. Postgres TIME columns are
 * represented by Prisma as DateTime values anchored to an arbitrary
 * base date — only the time-of-day portion is actually persisted.
 *
 * @param {string} value
 * @returns {Date|null}
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

    // Anchor to a fixed arbitrary UTC date — only time-of-day matters
    // for a @db.Time column; the date portion is ignored by Postgres.
    const anchored = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
    return Number.isNaN(anchored.getTime()) ? null : anchored;
  }

  // Fallback: already a full ISO datetime string
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * GET /api/evenements
 *
 * Fetch all club requests (DemandeClub), including the club's name and
 * the requesting president's identity, ordered by date_demande descending.
 *
 * Query params (optional):
 *   - statut (Soumise | En_Revue | Approuvee | Rejetee)
 *   - type   (Evenement | Salle | Materiel | Budget | Communication | Sponsoring)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getEvenements = async (req, res) => {
  try {
    const { statut, type } = req.query;

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

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type invalide: "${type}". Valeurs autorisées: ${VALID_TYPES.join(', ')}.`,
        });
      }
      where.type = type;
    }

    const evenements = await prisma.demandeClub.findMany({
      where,
      include: DEMANDE_CLUB_INCLUDE,
      orderBy: { date_demande: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: evenements.length,
      data: evenements,
    });
  } catch (error) {
    console.error('[Événements Club] Failed to fetch requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des demandes.',
    });
  }
};

/**
 * GET /api/evenements/:id
 *
 * Fetch a single club request by id_demande_club, with the same
 * relations as the list endpoint.
 *
 * URL params:
 *   - id: id_demande_club (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getEvenementById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const evenement = await prisma.demandeClub.findUnique({
      where: { id_demande_club: id },
      include: DEMANDE_CLUB_INCLUDE,
    });

    if (!evenement) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande trouvée avec l'id "${id}".`,
      });
    }

    return res.status(200).json({
      success: true,
      data: evenement,
    });
  } catch (error) {
    console.error('[Événements Club] Failed to fetch request:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération de la demande.',
    });
  }
};

/**
 * POST /api/evenements
 *
 * Create a new club request (event, room, equipment, budget,
 * communication, or sponsoring request). Status defaults to 'Soumise'.
 *
 * Body:
 *   - id_club         (required) UUID of the club making the request
 *   - id_president     (required) UUID of the requesting president record
 *   - type             (required) one of VALID_TYPES
 *   - objet            (required) short subject/title of the request
 *   - description      (optional) longer description
 *   - date_evenement   (optional) "YYYY-MM-DD"
 *   - heure_debut      (optional) "HH:mm" or "HH:mm:ss"
 *   - heure_fin        (optional) "HH:mm" or "HH:mm:ss"
 *   - budget_demande   (optional) numeric value
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createEvenement = async (req, res) => {
  try {
    const {
      id_club,
      id_president,
      type,
      objet,
      description,
      date_evenement,
      heure_debut,
      heure_fin,
      budget_demande,
    } = req.body;

    // --- Validation ---

    if (!id_club || !UUID_REGEX.test(id_club)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "id_club" est requis et doit être un UUID valide.',
      });
    }

    if (!id_president || !UUID_REGEX.test(id_president)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "id_president" est requis et doit être un UUID valide.',
      });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Le champ "type" est requis et doit être l'un des suivants: ${VALID_TYPES.join(', ')}.`,
      });
    }

    if (!objet || typeof objet !== 'string' || !objet.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "objet" est requis.',
      });
    }

    // --- Optional date_evenement ---
    let parsedDateEvenement = null;
    if (date_evenement !== undefined && date_evenement !== null && date_evenement !== '') {
      parsedDateEvenement = parseDateOnly(date_evenement);
      if (!parsedDateEvenement) {
        return res.status(400).json({
          success: false,
          message: `"date_evenement" n'est pas une date valide: "${date_evenement}".`,
        });
      }
    }

    // --- Optional heure_debut / heure_fin ---
    let parsedHeureDebut = null;
    if (heure_debut !== undefined && heure_debut !== null && heure_debut !== '') {
      parsedHeureDebut = parseTimeOnly(heure_debut);
      if (!parsedHeureDebut) {
        return res.status(400).json({
          success: false,
          message: `"heure_debut" n'est pas une heure valide: "${heure_debut}". Format attendu: "HH:mm".`,
        });
      }
    }

    let parsedHeureFin = null;
    if (heure_fin !== undefined && heure_fin !== null && heure_fin !== '') {
      parsedHeureFin = parseTimeOnly(heure_fin);
      if (!parsedHeureFin) {
        return res.status(400).json({
          success: false,
          message: `"heure_fin" n'est pas une heure valide: "${heure_fin}". Format attendu: "HH:mm".`,
        });
      }
    }

    // If both times are provided, ensure chronological order (both are
    // anchored to the same base date, so a direct comparison is valid).
    if (parsedHeureDebut && parsedHeureFin && parsedHeureFin <= parsedHeureDebut) {
      return res.status(400).json({
        success: false,
        message: '"heure_fin" doit être postérieure à "heure_debut".',
      });
    }

    // --- Optional budget_demande (Decimal) ---
    let budgetString = null;
    if (budget_demande !== undefined && budget_demande !== null && budget_demande !== '') {
      const budgetNum = Number(budget_demande);
      if (Number.isNaN(budgetNum) || budgetNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Le champ "budget_demande" doit être un nombre positif ou nul.',
        });
      }
      // Convert to string to avoid floating point precision issues when
      // passed to Prisma's Decimal field.
      budgetString = budgetNum.toString();
    }

    const newEvenement = await prisma.demandeClub.create({
      data: {
        id_club,
        id_president,
        type,
        objet: objet.trim(),
        description: description || null,
        date_demande: new Date(),
        statut: 'Soumise',
        date_evenement: parsedDateEvenement,
        heure_debut: parsedHeureDebut,
        heure_fin: parsedHeureFin,
        budget_demande: budgetString,
      },
      include: DEMANDE_CLUB_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: 'Demande créée avec succès.',
      data: newEvenement,
    });
  } catch (error) {
    // Prisma P2003 = foreign key constraint violation (invalid id_club
    // or id_president)
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez que "id_club" et "id_president" correspondent à des enregistrements existants.',
      });
    }

    console.error('[Événements Club] Failed to create request:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la création de la demande.',
    });
  }
};

/**
 * PUT /api/evenements/:id/statut
 *
 * Update the status of a club request (e.g. move to review, approve,
 * or reject).
 *
 * URL params:
 *   - id: id_demande_club (UUID)
 *
 * Body:
 *   - statut (required) one of Soumise | En_Revue | Approuvee | Rejetee
 *   - id_traite_par (optional) id of the staff/president member handling
 *     it — ideally sourced from req.user once auth middleware exists
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateEvenementStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, id_traite_par } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

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

    if (id_traite_par !== undefined && id_traite_par !== null && !UUID_REGEX.test(id_traite_par)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni pour "id_traite_par" ("${id_traite_par}") n'est pas un UUID valide.`,
      });
    }

    const existingEvenement = await prisma.demandeClub.findUnique({
      where: { id_demande_club: id },
    });

    if (!existingEvenement) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande trouvée avec l'id "${id}".`,
      });
    }

    const updateData = { statut };

    const staffId = (req.user && req.user.id_traite_par) || id_traite_par || null;
    if (staffId) {
      updateData.id_traite_par = staffId;
    }

    const updatedEvenement = await prisma.demandeClub.update({
      where: { id_demande_club: id },
      data: updateData,
      include: DEMANDE_CLUB_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: 'Statut de la demande mis à jour avec succès.',
      data: updatedEvenement,
    });
  } catch (error) {
    // Prisma P2025 = record to update not found (race condition:
    // deleted between the findUnique check and the update call)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'La demande est introuvable ou a déjà été supprimée.',
      });
    }

    // Prisma P2003 = foreign key constraint violation (e.g. invalid id_traite_par)
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez la valeur de "id_traite_par".',
      });
    }

    console.error('[Événements Club] Failed to update request status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

/**
 * GET /api/presidents
 *
 * Fetch all club president mandates, including the student's identity
 * (via etudiant -> utilisateur) and the club's basic info (nom, statut).
 *
 * Query params (optional):
 *   - statut ('Actif' or 'Expire')
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getPresidents = async (req, res) => {
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

    const presidents = await prisma.presidentClub.findMany({
      where,
      include: PRESIDENT_INCLUDE,
      orderBy: { date_designation: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: presidents.length,
      data: presidents,
    });
  } catch (error) {
    console.error('[Présidents Clubs] Failed to fetch presidents:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des présidents.',
    });
  }
};


module.exports = {
  getEvenements,
  getEvenementById,
  createEvenement,
  getPresidents,
  updateEvenementStatut,
};