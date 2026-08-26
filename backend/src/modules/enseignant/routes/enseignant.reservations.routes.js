const { Router } = require('express');
const {
  getSallesDisponibles,
  createReservation,
  getReservationsByEnseignant,
  annulerReservation,
} = require('../controllers/enseignant.reservations.controller');

const router = Router();

/**
 * @route   GET /api/enseignant/salles/disponibles
 * @desc    List active rooms available for a given date/time slot,
 *          excluding rooms with an overlapping approved reservation
 *          (and, if available, an overlapping session).
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.get('/salles/disponibles', getSallesDisponibles);

/**
 * @route   POST /api/enseignant/reservations
 * @desc    Create a new room reservation request (statut defaults to
 *          'Demandee').
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.post('/reservations', createReservation);

/**
 * @route   GET /api/enseignant/reservations/:id_enseignant
 * @desc    Fetch the reservation history for a specific teacher,
 *          including room info, ordered by date descending.
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.get('/reservations/:id_enseignant', getReservationsByEnseignant);

/**
 * @route   PUT /api/enseignant/reservations/:id/annuler
 * @desc    Cancel a reservation (only while statut is 'Demandee' or
 *          'Approuvee').
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.put('/reservations/:id/annuler', annulerReservation);

module.exports = router;