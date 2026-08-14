const { Router } = require('express');
const {
  getEvenements,
  getEvenementById,
  createEvenement,
  updateEvenementStatut,
} = require('../controllers/evenements.controller');

const router = Router();

/**
 * @route   GET /api/evenements
 * @desc    List all club requests (DemandeClub), including club name
 *          and requesting president identity. Optional statut/type filters.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/', getEvenements);

/**
 * @route   GET /api/evenements/:id
 * @desc    Fetch a single club request by id_demande_club.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/:id', getEvenementById);

/**
 * @route   POST /api/evenements
 * @desc    Create a new club request (statut defaults to 'Soumise').
 * @access  Private (apply auth/role middleware as needed)
 */
router.post('/', createEvenement);

/**
 * @route   PUT /api/evenements/:id/statut
 * @desc    Update the status of a club request.
 * @access  Private (apply auth/role middleware as needed)
 */
router.put('/:id/statut', updateEvenementStatut);

module.exports = router;