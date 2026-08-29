const { Router } = require('express');
const { getWorkflows, createWorkflow, updateWorkflowStatus, updateWorkflow, deleteWorkflow } = require('../controllers/scolarite.workflows.controller');

const router = Router();

/**
 * @route   GET /api/scolarite/workflows
 * @desc    List all workflows with their nested etapes
 *          (workflows sorted by date_creation desc, etapes by ordre asc).
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.get('/workflows', getWorkflows);

/**
 * @route   POST /api/scolarite/workflows
 * @desc    Create a new workflow blueprint along with its steps (etapes)
 *          via a single nested Prisma write.
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.post('/workflows', createWorkflow);

/**
 * @route   PATCH /api/scolarite/workflows/:id/status
 * @desc    Activate or deactivate a workflow (statut: Actif | Inactif).
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.patch('/workflows/:id/status', updateWorkflowStatus);

router.put('/workflows/:id', updateWorkflow);
router.delete('/workflows/:id', deleteWorkflow);

module.exports = router;