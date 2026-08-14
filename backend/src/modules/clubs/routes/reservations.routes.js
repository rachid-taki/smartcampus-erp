const { Router } = require('express');
const {
  getSalles,
  getReservations,
  createReservation,
  updateReservationStatut,
} = require('../controllers/reservations.controller');

const router = Router();

/**
 * @route   GET /api/salles
 * @desc    List all rooms, with optional filtering by type and/or statut.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/salles', getSalles);

/**
 * @route   GET /api/reservations
 * @desc    List all room reservations, including room info and requester
 *          identity. Ordered by date descending. Optional statut filter.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/reservations', getReservations);

/**
 * @route   POST /api/reservations
 * @desc    Create a new room reservation request (statut defaults to
 *          'Demandee').
 * @access  Private (apply auth/role middleware as needed)
 */
router.post('/reservations', createReservation);

/**
 * @route   PUT /api/reservations/:id/statut
 * @desc    Update the status of a reservation (approve/reject/cancel).
 * @access  Private (apply auth/role middleware as needed)
 */
router.put('/reservations/:id/statut', updateReservationStatut);

module.exports = router;