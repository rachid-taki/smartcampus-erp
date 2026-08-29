const express = require('express');

const router = express.Router();

const {
  getStats,
} = require('../controllers/dashboard.controller');

/**
 * GET /api/clubs-dashboard/stats
 *
 * Dashboard global du module Clubs &
 * Vie Étudiante.
 */
router.get('/stats', getStats);

module.exports = router;