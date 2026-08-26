const { Router } = require('express');
const {
  getPresidents,
  getPresidentById,
  updatePresident,
} = require('../controllers/presidents.controller');

const router = Router();

/**
 * @route   GET /api/presidents
 * @desc    List all club president mandates, including student identity
 *          and basic club info. Optional filtering by statut.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/', getPresidents);

/**
 * @route   GET /api/presidents/:id
 * @desc    Fetch a single president mandate by id_president.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/:id', getPresidentById);

/**
 * @route   PUT /api/presidents/:id
 * @desc    Update a president's mandate (date_fin_mandat and/or statut).
 * @access  Private (apply auth/role middleware as needed)
 */
router.put('/:id', updatePresident);

module.exports = router;