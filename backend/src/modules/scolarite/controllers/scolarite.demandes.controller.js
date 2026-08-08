require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Valid values for enum_statut_demande — used to validate incoming PATCH requests
// before they ever reach the database.
const VALID_STATUTS = [
  'Brouillon',
  'Soumise',
  'En_Traitement',
  'Validee',
  'Rejetee',
  'Cloturee',
];

/**
 * GET /api/scolarite/demandes
 *
 * Fetch all administrative requests, with optional filtering by statut
 * and free-text search on numero / objet. Results are sorted by
 * date_creation descending (newest first).
 *
 * Query params:
 *   - statut  (optional) e.g. ?statut=Soumise
 *   - search  (optional) matches against numero OR objet, case-insensitive
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getDemandes = async (req, res) => {
  try {
    const { statut, search } = req.query;

    // Build the WHERE clause dynamically based on provided query params
    const where = {};

    // Filter by statut, if provided and valid
    if (statut) {
      if (!VALID_STATUTS.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_STATUTS.join(', ')}.`,
        });
      }
      where.statut = statut;
    }

    // Free-text search across numero and objet (case-insensitive)
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { objet: { contains: search, mode: 'insensitive' } },
      ];
    }

    const demandes = await prisma.demande.findMany({
      where,
      orderBy: { date_creation: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: demandes.length,
      data: demandes,
    });
  } catch (error) {
    console.error('[Scolarité Demandes] Failed to fetch demandes:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des demandes.',
    });
  }
};

/**
 * PATCH /api/scolarite/demandes/:id/status
 *
 * Update the status of a specific request. Also records optional staff
 * comments and the id of the staff member handling the request.
 *
 * URL params:
 *   - id: id_demande (UUID) of the request to update
 *
 * Body:
 *   - statut       (required) new status — must be one of VALID_STATUTS
 *   - commentaires (optional) staff notes / remarks
 *
 * NOTE: id_traite_par should normally come from the authenticated user's
 * session (e.g. req.user.id_scolarite) once auth middleware is in place.
 * Until then, it falls back to req.body.id_traite_par if explicitly sent.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateDemandeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaires } = req.body;

    // --- Validation ---

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

    // --- Verify the request exists before attempting the update ---

    const existingDemande = await prisma.demande.findUnique({
      where: { id_demande: id },
    });

    if (!existingDemande) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande trouvée avec l'id "${id}".`,
      });
    }

    // Identify the staff member handling this request.
    // Prefer an authenticated session (req.user), fall back to body for now.
    const idTraitePar =
      (req.user && req.user.id_scolarite) || req.body.id_traite_par || null;

    // --- Build the update payload ---
    // Only overwrite commentaires if explicitly provided, so we don't
    // accidentally wipe existing notes with an empty PATCH body.
    const updateData = {
      statut,
      id_traite_par: idTraitePar,
    };

    if (commentaires !== undefined) {
      updateData.commentaires = commentaires;
    }

    const updatedDemande = await prisma.demande.update({
      where: { id_demande: id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Statut de la demande mis à jour avec succès.',
      data: updatedDemande,
    });
  } catch (error) {
    // Prisma throws P2025 when the record to update is not found
    // (race condition: deleted between the findUnique check and update)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'La demande est introuvable ou a déjà été supprimée.',
      });
    }

    console.error('[Scolarité Demandes] Failed to update status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

module.exports = {
  getDemandes,
  updateDemandeStatus,
};