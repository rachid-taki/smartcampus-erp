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

const VALID_STATUTS = ['Actif', 'Expire'];

// Shared include shape used across GET (list), GET (single), and PUT
// so the response structure stays identical everywhere.
const PRESIDENT_INCLUDE = {
  etudiant: {
    include: {
      utilisateur: {
        select: { nom: true, prenom: true, email: true, telephone: true },
      },
    },
  },
  club: {
    select: { nom: true, statut: true },
  },
};

/**
 * Safely parse a date string into a valid Date object.
 *
 * @param {string} value
 * @returns {Date|null} a valid Date, or null if unparseable
 */
const parseDateSafe = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

/**
 * GET /api/presidents/:id
 *
 * Fetch a single president mandate by id_president, with the same
 * relations as the list endpoint.
 *
 * URL params:
 *   - id: id_president (UUID)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getPresidentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    const president = await prisma.presidentClub.findUnique({
      where: { id_president: id },
      include: PRESIDENT_INCLUDE,
    });

    if (!president) {
      return res.status(404).json({
        success: false,
        message: `Aucun président trouvé avec l'id "${id}".`,
      });
    }

    return res.status(200).json({
      success: true,
      data: president,
    });
  } catch (error) {
    console.error('[Présidents Clubs] Failed to fetch president:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération du président.',
    });
  }
};

/**
 * PUT /api/presidents/:id
 *
 * Update a president's mandate — typically used to end/expire a mandate
 * by setting date_fin_mandat and flipping statut to 'Expire', though any
 * valid combination of the two fields is accepted.
 *
 * URL params:
 *   - id: id_president (UUID)
 *
 * Body:
 *   - date_fin_mandat  (optional) ISO date string, or null to clear it
 *   - statut           (optional) 'Actif' or 'Expire'
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updatePresident = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_fin_mandat, statut } = req.body;

    // --- Validate the id param before hitting the database ---
    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: `L'identifiant fourni ("${id}") n'est pas un UUID valide.`,
      });
    }

    // --- Validate statut if provided ---
    if (statut !== undefined && !VALID_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
      });
    }

    // --- Validate/parse date_fin_mandat if provided ---
    const updateData = {};

    if (date_fin_mandat !== undefined) {
      if (date_fin_mandat === null || date_fin_mandat === '') {
        updateData.date_fin_mandat = null;
      } else {
        const parsedDate = parseDateSafe(date_fin_mandat);
        if (!parsedDate) {
          return res.status(400).json({
            success: false,
            message: `"date_fin_mandat" n'est pas une date valide: "${date_fin_mandat}".`,
          });
        }
        updateData.date_fin_mandat = parsedDate;
      }
    }

    if (statut !== undefined) {
      updateData.statut = statut;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun champ valide à mettre à jour n\'a été fourni (attendu: "date_fin_mandat" et/ou "statut").',
      });
    }

    // --- Verify the president exists before attempting the update ---
    const existingPresident = await prisma.presidentClub.findUnique({
      where: { id_president: id },
    });

    if (!existingPresident) {
      return res.status(404).json({
        success: false,
        message: `Aucun président trouvé avec l'id "${id}".`,
      });
    }

    const updatedPresident = await prisma.presidentClub.update({
      where: { id_president: id },
      data: updateData,
      include: PRESIDENT_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: 'Mandat du président mis à jour avec succès.',
      data: updatedPresident,
    });
  } catch (error) {
    // Prisma P2025 = record to update not found (race condition:
    // deleted between the findUnique check and the update call)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Le président est introuvable ou a déjà été supprimé.',
      });
    }

    console.error('[Présidents Clubs] Failed to update president mandate:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du mandat.',
    });
  }
};

module.exports = {
  getPresidents,
  getPresidentById,
  updatePresident,
};