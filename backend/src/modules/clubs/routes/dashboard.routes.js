const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/dashboard.controller');

/**
 * @route   GET /api/clubs-dashboard/stats
 * @desc    Aggregated KPIs for the Module 8 (Clubs & Smart Campus) dashboard:
 *          clubs, pending requests, pending reservations, live sessions,
 *          and unresolved AI alerts.
 */
router.get('/stats', getStats);

module.exports = router;