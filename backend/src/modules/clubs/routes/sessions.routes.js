const { Router } = require('express');
const {
  getSessions,
  createSession,
  updateSessionStatut,
  getCours,
  getProfesseurs
} = require('../controllers/sessions.controller');

const router = Router();

// Routes pour les listes déroulantes (toujours en haut)
router.get('/cours', getCours);
router.get('/professeurs', getProfesseurs);

// Routes pour les Sessions (corrigées avec "/")
router.get('/', getSessions);
router.post('/', createSession);
router.put('/:id/statut', updateSessionStatut);

module.exports = router;