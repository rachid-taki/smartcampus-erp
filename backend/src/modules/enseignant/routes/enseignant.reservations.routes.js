const { Router } = require('express');
const {
  getSallesDisponibles,
  createReservation,
  getReservationsByEnseignant,
  annulerReservation,
} = require('../controllers/enseignant.reservations.controller');

const authMiddleware = require('../../authentification/middlewares/auth.middleware');

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware.verifyToken || authMiddleware);

/**
 * @route   GET /api/enseignant/salles-reservations/salles/disponibles
 */
router.get('/salles/disponibles', getSallesDisponibles);

/**
 * @route   POST /api/enseignant/salles-reservations/reservations
 */
router.post('/reservations', createReservation);

/**
 * @route   GET /api/enseignant/salles-reservations/reservations
 */
router.get('/reservations', getReservationsByEnseignant);

/**
 * @route   PUT /api/enseignant/salles-reservations/reservations/:id/annuler
 */
router.put('/reservations/:id/annuler', annulerReservation);

module.exports = router;