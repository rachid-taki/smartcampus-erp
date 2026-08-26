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

/**
 * Safely parse a date string ("YYYY-MM-DD" or a full ISO string) into
 * a valid Date object suitable for a Prisma `@db.Date` field.
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
 * Validate that the provided `periodes` value is either undefined,
 * null, an array, or a plain object — the only shapes that make sense
 * for a Json column meant to store a list of period entries.
 *
 * @param {*} value
 * @returns {boolean}
 */
const isValidPeriodesShape = (value) => {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return true;
  return typeof value === 'object';
};

/**
 * GET /api/calendriers
 *
 * Fetch all academic calendars, ordered by annee_scolaire descending
 * (most recent school year first).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getCalendriers = async (req, res) => {
  try {
    const calendriers = await prisma.calendrierAcademique.findMany({
      orderBy: { annee_scolaire: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: calendriers.length,
      data: calendriers,
    });
  } catch (error) {
    console.error('[Calendriers Académiques] Failed to fetch calendars:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des calendriers académiques.',
    });
  }
};

/**
 * GET /api/calendriers/:id
 *
 * Fetch a single academic calendar by id_calendrier.
 *
 * URL params:
 *   - id: id_calendrier (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getCalendrierById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const calendrier = await prisma.calendrierAcademique.findUnique({
      where: { id_calendrier: id },
    });

    if (!calendrier) {
      return res.status(404).json({
        success: false,
        message: `Aucun calendrier académique trouvé avec l'id "${id}".`,
      });
    }

    return res.status(200).json({
      success: true,
      data: calendrier,
    });
  } catch (error) {
    console.error('[Calendriers Académiques] Failed to fetch calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération du calendrier académique.',
    });
  }
};

/**
 * POST /api/calendriers
 *
 * Create a new academic calendar.
 *
 * Body:
 *   - nom             (required) display name, e.g. "Calendrier Principal 2026-2027"
 *   - annee_scolaire  (required) unique school year label, e.g. "2026-2027"
 *   - date_debut      (required) "YYYY-MM-DD" — must be a valid date
 *   - date_fin        (required) "YYYY-MM-DD" — must be strictly after date_debut
 *   - periodes        (optional) array or object of period entries, stored as-is (Json)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createCalendrier = async (req, res) => {
  try {
    const { nom, annee_scolaire, date_debut, date_fin, periodes } = req.body;

    // --- Validation ---

    if (!nom || typeof nom !== 'string' || !nom.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "nom" est requis.',
      });
    }

    if (!annee_scolaire || typeof annee_scolaire !== 'string' || !annee_scolaire.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "annee_scolaire" est requis.',
      });
    }

    if (!date_debut) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "date_debut" est requis.',
      });
    }

    const parsedDateDebut = parseDateOnly(date_debut);
    if (!parsedDateDebut) {
      return res.status(400).json({
        success: false,
        message: `"date_debut" n'est pas une date valide: "${date_debut}".`,
      });
    }

    if (!date_fin) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "date_fin" est requis.',
      });
    }

    const parsedDateFin = parseDateOnly(date_fin);
    if (!parsedDateFin) {
      return res.status(400).json({
        success: false,
        message: `"date_fin" n'est pas une date valide: "${date_fin}".`,
      });
    }

    if (parsedDateFin <= parsedDateDebut) {
      return res.status(400).json({
        success: false,
        message: '"date_fin" doit être strictement postérieure à "date_debut".',
      });
    }

    if (!isValidPeriodesShape(periodes)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "periodes" doit être un tableau ou un objet JSON valide.',
      });
    }

    const newCalendrier = await prisma.calendrierAcademique.create({
      data: {
        nom: nom.trim(),
        annee_scolaire: annee_scolaire.trim(),
        date_debut: parsedDateDebut,
        date_fin: parsedDateFin,
        periodes: periodes !== undefined ? periodes : undefined,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Calendrier académique créé avec succès.',
      data: newCalendrier,
    });
  } catch (error) {
    // Prisma P2002 = unique constraint violation (duplicate annee_scolaire)
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : error.meta?.target || 'annee_scolaire';

      return res.status(409).json({
        success: false,
        message: `Un calendrier existe déjà pour cette année scolaire (${target}). L'année scolaire doit être unique.`,
      });
    }

    console.error('[Calendriers Académiques] Failed to create calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la création du calendrier académique.',
    });
  }
};

/**
 * PUT /api/calendriers/:id
 *
 * Update an existing academic calendar. Accepts any combination of
 * nom, annee_scolaire, date_debut, date_fin, periodes — only provided
 * fields are updated.
 *
 * URL params:
 *   - id: id_calendrier (UUID)
 *
 * Body (all optional):
 *   - nom
 *   - annee_scolaire
 *   - date_debut
 *   - date_fin
 *   - periodes
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateCalendrier = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, annee_scolaire, date_debut, date_fin, periodes } = req.body;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    // --- Verify the calendar exists before attempting the update ---
    const existingCalendrier = await prisma.calendrierAcademique.findUnique({
      where: { id_calendrier: id },
    });

    if (!existingCalendrier) {
      return res.status(404).json({
        success: false,
        message: `Aucun calendrier académique trouvé avec l'id "${id}".`,
      });
    }

    // --- Parse/validate dates if provided, falling back to existing
    // values when only one of the two is being changed, so the
    // date_fin > date_debut check remains meaningful. ---
    let parsedDateDebut = existingCalendrier.date_debut;
    if (date_debut !== undefined) {
      if (!date_debut) {
        return res.status(400).json({
          success: false,
          message: 'Le champ "date_debut" ne peut pas être vide.',
        });
      }
      const parsed = parseDateOnly(date_debut);
      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: `"date_debut" n'est pas une date valide: "${date_debut}".`,
        });
      }
      parsedDateDebut = parsed;
    }

    let parsedDateFin = existingCalendrier.date_fin;
    if (date_fin !== undefined) {
      if (!date_fin) {
        return res.status(400).json({
          success: false,
          message: 'Le champ "date_fin" ne peut pas être vide.',
        });
      }
      const parsed = parseDateOnly(date_fin);
      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: `"date_fin" n'est pas une date valide: "${date_fin}".`,
        });
      }
      parsedDateFin = parsed;
    }

    if ((date_debut !== undefined || date_fin !== undefined) && parsedDateFin <= parsedDateDebut) {
      return res.status(400).json({
        success: false,
        message: '"date_fin" doit être strictement postérieure à "date_debut".',
      });
    }

    if (!isValidPeriodesShape(periodes)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "periodes" doit être un tableau ou un objet JSON valide.',
      });
    }

    // --- Build partial update payload ---
    const updateData = {};

    if (nom !== undefined) {
      if (!nom.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le champ "nom" ne peut pas être vide.',
        });
      }
      updateData.nom = nom.trim();
    }

    if (annee_scolaire !== undefined) {
      if (!annee_scolaire.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le champ "annee_scolaire" ne peut pas être vide.',
        });
      }
      updateData.annee_scolaire = annee_scolaire.trim();
    }

    if (date_debut !== undefined) {
      updateData.date_debut = parsedDateDebut;
    }

    if (date_fin !== undefined) {
      updateData.date_fin = parsedDateFin;
    }

    if (periodes !== undefined) {
      // Accept null explicitly to clear the field, or an array/object
      // to replace it entirely — stored as-is per the Json column.
      updateData.periodes = periodes;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun champ valide à mettre à jour n\'a été fourni.',
      });
    }

    const updatedCalendrier = await prisma.calendrierAcademique.update({
      where: { id_calendrier: id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Calendrier académique mis à jour avec succès.',
      data: updatedCalendrier,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Le calendrier académique est introuvable ou a déjà été supprimé.',
      });
    }

    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : error.meta?.target || 'annee_scolaire';

      return res.status(409).json({
        success: false,
        message: `Un calendrier existe déjà pour cette année scolaire (${target}). L'année scolaire doit être unique.`,
      });
    }

    console.error('[Calendriers Académiques] Failed to update calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du calendrier académique.',
    });
  }
};

/**
 * DELETE /api/calendriers/:id
 *
 * Delete an academic calendar permanently.
 *
 * URL params:
 *   - id: id_calendrier (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const deleteCalendrier = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const existingCalendrier = await prisma.calendrierAcademique.findUnique({
      where: { id_calendrier: id },
    });

    if (!existingCalendrier) {
      return res.status(404).json({
        success: false,
        message: `Aucun calendrier académique trouvé avec l'id "${id}".`,
      });
    }

    await prisma.calendrierAcademique.delete({
      where: { id_calendrier: id },
    });

    return res.status(200).json({
      success: true,
      message: 'Calendrier académique supprimé avec succès.',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Le calendrier académique est introuvable ou a déjà été supprimé.',
      });
    }

    // Prisma P2003 = foreign key constraint violation (e.g. this
    // calendar is still referenced by other records with a restrictive
    // relation, if such a relation exists in the schema).
    if (error.code === 'P2003') {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer ce calendrier: des enregistrements liés y font encore référence.',
      });
    }

    console.error('[Calendriers Académiques] Failed to delete calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la suppression du calendrier académique.',
    });
  }
};

module.exports = {
  getCalendriers,
  getCalendrierById,
  createCalendrier,
  updateCalendrier,
  deleteCalendrier,
};