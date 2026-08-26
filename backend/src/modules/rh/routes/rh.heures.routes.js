const { Router } = require('express');
const {
  getHeuresSupplementaires,
  createHeureSupplementaire,
  updateHeureSupplementaireStatut,
} = require('../controllers/rh.heures.controller');

const router = Router();

/**
 * @route   GET /api/rh/heures-supplementaires
 * @desc    List all overtime requests (type: 'Heure_Supplementaire'),
 *          including employee and handling HR staff identities.
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.get('/heures-supplementaires', getHeuresSupplementaires);

/**
 * @route   POST /api/rh/heures-supplementaires
 * @desc    Submit a new overtime request. Status defaults to 'Soumise';
 *          type is fixed to 'Heure_Supplementaire'.
 * @access  Private (Employee or RH staff — apply auth/role middleware as needed)
 */
router.post('/heures-supplementaires', createHeureSupplementaire);

/**
 * @route   PUT /api/rh/heures-supplementaires/:id/statut
 * @desc    Update the status of an overtime request (HR validation/rejection).
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.put('/heures-supplementaires/:id/statut', updateHeureSupplementaireStatut);

module.exports = router;