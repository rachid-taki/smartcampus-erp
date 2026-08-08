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

// This controller is scoped exclusively to overtime requests —
// enum_type_demande_rh contains other unrelated types we exclude here.
const HEURE_SUP_TYPE = 'Heure_Supplementaire';

const VALID_STATUTS = ['Soumise', 'En_Traitement', 'Validee', 'Rejetee'];

// CRITICAL: exact include shape required to avoid Prisma validation errors.
// traite_par -> employe -> utilisateur, NOT traite_par -> utilisateur directly.
const HEURES_INCLUDE = {
  employe: {
    include: {
      utilisateur: {
        select: { id_utilisateur: true, nom: true, prenom: true, email: true },
      },
    },
  },
  traite_par: {
    include: {
      employe: {
        include: {
          utilisateur: { select: { nom: true, prenom: true } },
        },
      },
    },
  },
};

/**
 * GET /api/rh/heures-supplementaires
 *
 * Fetch all overtime requests (type: 'Heure_Supplementaire'), including
 * the requesting employee's identity and the handling HR staff member's
 * identity (if assigned).
 *
 * Query params (optional):
 *   - statut (filter by status)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getHeuresSupplementaires = async (req, res) => {
  try {
    const { statut } = req.query;

    const where = {
      type: HEURE_SUP_TYPE,
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

    const heuresSupplementaires = await prisma.demandeRh.findMany({
      where,
      include: HEURES_INCLUDE,
      orderBy: { date_demande: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: heuresSupplementaires.length,
      data: heuresSupplementaires,
    });
  } catch (error) {
    console.error('[RH Heures Sup] Failed to fetch overtime requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des heures supplémentaires.',
    });
  }
};

/**
 * POST /api/rh/heures-supplementaires
 *
 * Create a new overtime request. Status defaults to 'Soumise' and
 * type is fixed to 'Heure_Supplementaire'.
 *
 * Body:
 *   - id_employe  (required) UUID of the requesting employee
 *   - date_debut  (required) date the overtime was worked
 *   - duree       (required) number of overtime hours, must be > 0
 *   - motif       (required) justification for the overtime
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createHeureSupplementaire = async (req, res) => {
  try {
    const { id_employe, date_debut, duree, motif } = req.body;

    // --- Validation ---

    if (!id_employe || !UUID_REGEX.test(id_employe)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "id_employe" est requis et doit être un UUID valide.',
      });
    }

    if (!date_debut) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "date_debut" (date des heures travaillées) est requis.',
      });
    }

    const parsedDate = new Date(date_debut);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '"date_debut" n\'est pas une date valide.',
      });
    }

    if (duree === undefined || duree === null || duree === '') {
      return res.status(400).json({
        success: false,
        message: 'Le champ "duree" (nombre d\'heures) est requis.',
      });
    }

    const dureeNum = Number(duree);
    if (Number.isNaN(dureeNum) || dureeNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "duree" doit être un nombre supérieur à 0.',
      });
    }

    if (!motif || typeof motif !== 'string' || !motif.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "motif" est requis.',
      });
    }

    // --- Verify the employee exists before creating the request ---
    const employe = await prisma.employe.findUnique({
      where: { id_employe },
    });

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: `Aucun employé trouvé avec l'id "${id_employe}".`,
      });
    }

    const newHeureSup = await prisma.demandeRh.create({
      data: {
        id_employe,
        type: HEURE_SUP_TYPE,
        statut: 'Soumise',
        date_demande: new Date(),
        date_debut: parsedDate,
        duree: dureeNum,
        motif: motif.trim(),
      },
      include: HEURES_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: "Demande d'heures supplémentaires créée avec succès.",
      data: newHeureSup,
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez que "id_employe" correspond à un employé existant.',
      });
    }

    console.error('[RH Heures Sup] Failed to create overtime request:', error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la création de la demande d'heures supplémentaires.",
    });
  }
};

/**
 * PUT /api/rh/heures-supplementaires/:id/statut
 *
 * Update the status of an overtime request (HR validation/rejection).
 *
 * URL params:
 *   - id: id_demande_rh (UUID)
 *
 * Body:
 *   - statut           (required) one of Soumise | En_Traitement | Validee | Rejetee
 *   - commentaires_rh   (optional) HR notes/remarks
 *   - id_traite_par     (optional) id of the HR staff member (Employe) handling
 *                        it — ideally sourced from req.user once auth exists
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateHeureSupplementaireStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaires_rh, id_traite_par } = req.body;

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

    // --- Verify the request exists and is actually an overtime request ---
    const existingHeureSup = await prisma.demandeRh.findUnique({
      where: { id_demande_rh: id },
    });

    if (!existingHeureSup || existingHeureSup.type !== HEURE_SUP_TYPE) {
      return res.status(404).json({
        success: false,
        message: `Aucune demande d'heures supplémentaires trouvée avec l'id "${id}".`,
      });
    }

    const staffId = (req.user && req.user.id_rh_staff) || id_traite_par || null;

    const updateData = { statut };

    if (commentaires_rh !== undefined) {
      updateData.commentaires_rh = commentaires_rh;
    }

    if (staffId) {
      updateData.id_traite_par = staffId;
    }

    const updatedHeureSup = await prisma.demandeRh.update({
      where: { id_demande_rh: id },
      data: updateData,
      include: HEURES_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message: "Statut de la demande d'heures supplémentaires mis à jour avec succès.",
      data: updatedHeureSup,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "La demande d'heures supplémentaires est introuvable ou a déjà été supprimée.",
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Référence invalide: vérifiez la valeur de "id_traite_par".',
      });
    }

    console.error('[RH Heures Sup] Failed to update overtime request status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut.',
    });
  }
};

module.exports = {
  getHeuresSupplementaires,
  createHeureSupplementaire,
  updateHeureSupplementaireStatut,
};