const { Router } = require('express');
const { getDashboardStats } = require('../controllers/rh.dashboard.controller');

const router = Router();

/**
 * @route   GET /api/rh/dashboard/stats
 * @desc    Fetch aggregated KPIs for the HR dashboard: employee counts,
 *          pending request breakdown, department distribution, and
 *          recent request activity.
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;