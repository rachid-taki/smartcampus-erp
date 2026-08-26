const { Router } = require('express');
const {
  getAlertes,
  updateStatut,
  analyze
} = require('../controllers/alertes.controller');

const router = Router();

// GET /api/alertes
router.get('/', getAlertes);

// PUT /api/alertes/:id/statut
router.put('/:id/statut', updateStatut);

// POST /api/alertes/analyze
router.post('/analyze', analyze);

module.exports = router;