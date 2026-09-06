const express = require('express');
const router = express.Router();

// Import des fonctions de votre contrôleur
const {
  getSessions,
  createSession,
  updateSessionStatut,
  getCours,
  getProfesseurs,
} = require('../controllers/scolarite.sessions.controller'); // Ajustez le chemin selon votre structure

// ─── Routes pour les Sessions ───

// GET /api/sessions
router.get('/', getSessions);

// POST /api/sessions
router.post('/', createSession);

// PUT /api/sessions/:id/statut
router.put('/:id/statut', updateSessionStatut);

// GET /api/sessions/cours
router.get('/cours', getCours);

// GET /api/sessions/professeurs
router.get('/professeurs', getProfesseurs);

module.exports = router;