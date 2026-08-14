const { Router } = require('express');
const {
  getCalendriers,
  getCalendrierById,
  createCalendrier,
  updateCalendrier,
  deleteCalendrier,
} = require('../controllers/calendriers.controller');

const router = Router();

/**
 * @route   GET /api/calendriers
 * @desc    List all academic calendars, ordered by annee_scolaire descending.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/', getCalendriers);

/**
 * @route   GET /api/calendriers/:id
 * @desc    Fetch a single academic calendar by id_calendrier.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/:id', getCalendrierById);

/**
 * @route   POST /api/calendriers
 * @desc    Create a new academic calendar.
 * @access  Private (apply auth/role middleware as needed)
 */
router.post('/', createCalendrier);

/**
 * @route   PUT /api/calendriers/:id
 * @desc    Update an existing academic calendar (partial update,
 *          including the periodes JSON field).
 * @access  Private (apply auth/role middleware as needed)
 */
router.put('/:id', updateCalendrier);

/**
 * @route   DELETE /api/calendriers/:id
 * @desc    Delete an academic calendar.
 * @access  Private (apply auth/role middleware as needed)
 */
router.delete('/:id', deleteCalendrier);

module.exports = router;