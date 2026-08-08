const { Router } = require('express');
const {
  getConges,
  createConge,
  updateCongeStatut,
} = require('../controllers/rh.conges.controller');

const router = Router();

/**
 * @route   GET /api/rh/conges
 * @desc    List all leave requests (Conge_Normal, Conge_Exceptionnel,
 *          Conge_Maladie), including employee identity via utilisateur.
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.get('/conges', getConges);

/**
 * @route   POST /api/rh/conges
 * @desc    Submit a new leave request. Status defaults to 'Soumise';
 *          duree is auto-calculated from date_debut/date_fin if omitted.
 * @access  Private (Employee or RH staff — apply auth/role middleware as needed)
 */
router.post('/conges', createConge);

/**
 * @route   PUT /api/rh/conges/:id/statut
 * @desc    Update the status of a leave request (HR validation/rejection).
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.put('/conges/:id/statut', updateCongeStatut);

module.exports = router;