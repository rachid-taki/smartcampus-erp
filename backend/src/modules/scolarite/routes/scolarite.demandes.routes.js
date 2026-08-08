const { Router } = require('express');
const {
  getDemandes,
  updateDemandeStatus,
} = require('../controllers/scolarite.demandes.controller');

const router = Router();

/**
 * @route   GET /api/scolarite/demandes
 * @desc    List administrative requests, with optional filtering by
 *          statut and search on numero/objet. Sorted by date_creation desc.
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.get('/demandes', getDemandes);

/**
 * @route   PATCH /api/scolarite/demandes/:id/status
 * @desc    Update the statut, commentaires, and id_traite_par of a
 *          specific request.
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.patch('/demandes/:id/status', updateDemandeStatus);

module.exports = router;