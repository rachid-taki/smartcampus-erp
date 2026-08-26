require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split('?')[0];
const pool = new Pool({ connectionString: cleanUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Valid values for enum_statut_workflow
const VALID_WORKFLOW_STATUTS = ['Actif', 'Inactif'];

/**
 * GET /api/scolarite/workflows
 *
 * Fetch all workflow blueprints along with their nested etapes.
 * Workflows are ordered by date_creation descending (newest first).
 * Nested etapes are ordered by ordre ascending (step 1, 2, 3...).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getWorkflows = async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { date_creation: 'desc' },
      include: {
        etapes: {
          orderBy: { ordre: 'asc' },
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: workflows.length,
      data: workflows,
    });
  } catch (error) {
    console.error('[Scolarité Workflows] Failed to fetch workflows:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des workflows.',
    });
  }
};

/**
 * POST /api/scolarite/workflows
 *
 * Create a new workflow blueprint along with its steps (etapes) in a
 * single nested write / transaction.
 *
 * Body:
 *   - nom          (required) name of the workflow
 *   - description  (optional) description text
 *   - etapes       (required) array of { nom, ordre, role_responsable? }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createWorkflow = async (req, res) => {
  try {
    const { nom, description, etapes } = req.body;

    // --- Validation ---

    if (!nom || typeof nom !== 'string' || !nom.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "nom" est requis.',
      });
    }

    if (!Array.isArray(etapes) || etapes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "etapes" doit être un tableau contenant au moins une étape.',
      });
    }

    // Validate each step has the required shape before touching the DB
    for (let i = 0; i < etapes.length; i++) {
      const etape = etapes[i];

      if (!etape || typeof etape !== 'object') {
        return res.status(400).json({
          success: false,
          message: `L'étape à l'index ${i} est invalide.`,
        });
      }

      if (!etape.nom || typeof etape.nom !== 'string' || !etape.nom.trim()) {
        return res.status(400).json({
          success: false,
          message: `L'étape à l'index ${i} doit avoir un champ "nom" valide.`,
        });
      }

      if (etape.ordre === undefined || etape.ordre === null || Number.isNaN(Number(etape.ordre))) {
        return res.status(400).json({
          success: false,
          message: `L'étape à l'index ${i} doit avoir un champ "ordre" numérique valide.`,
        });
      }
    }

    // --- Nested write: create the workflow + its etapes in one transaction ---
    const newWorkflow = await prisma.workflow.create({
      data: {
        nom: nom.trim(),
        description: description || null,
        etapes: {
          create: etapes.map((etape) => ({
            nom: etape.nom.trim(),
            ordre: Number(etape.ordre),
            role_responsable: etape.role_responsable || null,
          })),
        },
      },
      include: {
        etapes: {
          orderBy: { ordre: 'asc' },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Workflow créé avec succès.',
      data: newWorkflow,
    });
  } catch (error) {
    console.error('[Scolarité Workflows] Failed to create workflow:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la création du workflow.',
    });
  }
};

/**
 * PATCH /api/scolarite/workflows/:id/status
 *
 * Activate or deactivate a workflow by updating its statut.
 *
 * URL params:
 *   - id: id_workflow (UUID) of the workflow to update
 *
 * Body:
 *   - statut (required) — must be "Actif" or "Inactif"
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateWorkflowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    // --- Validation ---

    if (!statut) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "statut" est requis.',
      });
    }

    if (!VALID_WORKFLOW_STATUTS.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide: "${statut}". Valeurs autorisées: ${VALID_WORKFLOW_STATUTS.join(', ')}.`,
      });
    }

    // --- Verify the workflow exists before attempting the update ---

    const existingWorkflow = await prisma.workflow.findUnique({
      where: { id_workflow: id },
    });

    if (!existingWorkflow) {
      return res.status(404).json({
        success: false,
        message: `Aucun workflow trouvé avec l'id "${id}".`,
      });
    }

    const updatedWorkflow = await prisma.workflow.update({
      where: { id_workflow: id },
      data: { statut },
      include: {
        etapes: {
          orderBy: { ordre: 'asc' },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Workflow ${statut === 'Actif' ? 'activé' : 'désactivé'} avec succès.`,
      data: updatedWorkflow,
    });
  } catch (error) {
    // Prisma throws P2025 when the record to update is not found
    // (race condition: deleted between the findUnique check and update)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Le workflow est introuvable ou a déjà été supprimé.',
      });
    }

    console.error('[Scolarité Workflows] Failed to update workflow status:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour du statut du workflow.',
    });
  }
};

module.exports = {
  getWorkflows,
  createWorkflow,
  updateWorkflowStatus,
};