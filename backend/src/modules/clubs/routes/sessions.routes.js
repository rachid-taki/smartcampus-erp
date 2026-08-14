const { Router } = require('express');
const {
  getSessions,
  createSession,
  updateSessionStatut,
} = require('../controllers/sessions.controller');

const router = Router();

/**
 * @route   GET /api/sessions
 * @desc    List all classroom sessions, including room, course, and
 *          teacher identity. Ordered by date desc, then heure_debut desc.
 *          Optional filters: statut, id_salle, date.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/', getSessions);

/**
 * @route   POST /api/sessions
 * @desc    Create a new classroom session (statut defaults to 'Planifiee').
 * @access  Private (apply auth/role middleware as needed)
 */
router.post('/', createSession);

/**
 * @route   PUT /api/sessions/:id/statut
 * @desc    Update a session's tracking status (live check-in/check-out,
 *          headcount) — the future entry point for RFID/QR attendance
 *          and empty-room AI alerts.
 * @access  Private (apply auth/role middleware as needed)
 */
router.put('/:id/statut', updateSessionStatut);

module.exports = router;