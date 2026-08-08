const express = require('express');
// Notice the '../controllers/' path to properly navigate the folder tree
const { getDashboardStats } = require('../controllers/scolarite.dashboard.controller');

const router = express.Router();

/**
 * @route   GET /api/scolarite/dashboard/stats
 * @desc    Fetch KPI statistics
 */
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;