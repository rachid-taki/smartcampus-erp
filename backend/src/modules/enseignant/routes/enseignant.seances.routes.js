const { Router } = require('express');
const {
  getUpcomingSessions,
  updateSession,
  resolveConflicts,
  endCourseEarly,
  getCommunicationContext,
  notifyStudents,
  getPlanContext,
  createSession
} = require('../controllers/enseignant.seances.controller');
const authMiddleware = require('../../authentification/middlewares/auth.middleware');

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware.verifyToken || authMiddleware);

// --- ROUTES STATIQUES (toujours en premier) ---
router.get('/upcoming', getUpcomingSessions);
router.get('/plan-context', getPlanContext);
router.post('/resolve-conflicts', resolveConflicts);
router.delete('/end-course', endCourseEarly);

// --- COMMUNICATIONS ---
router.get('/communications/context', getCommunicationContext);
router.post('/communications/notify', notifyStudents);

// --- CRÉATION & MODIFICATION ---
router.post('/', createSession);
router.put('/:id', updateSession);

module.exports = router;