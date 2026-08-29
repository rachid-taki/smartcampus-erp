const { Router } = require('express');
const {
  getSessionStudents,
  validateAttendance
} = require('../controllers/enseignant.presences.controller');
const authMiddleware = require('../../authentification/middlewares/auth.middleware');

const router = Router();

// Secure all routes with authentication middleware
router.use(authMiddleware.verifyToken || authMiddleware);

/**
 * @route   GET /api/enseignant/presences/sessions/:id_session/etudiants
 * @desc    Get the student list and their current presence status for a specific session
 * @access  Private (Teacher)
 */
router.get('/sessions/:id_session/etudiants', getSessionStudents);

/**
 * @route   POST /api/enseignant/presences/sessions/:id_session/valider
 * @desc    Validate attendance. Accepts an array of absent student IDs.
 * @access  Private (Teacher)
 */
router.post('/sessions/:id_session/valider', validateAttendance);

module.exports = router;