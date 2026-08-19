const { Router } = require('express');
const {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
} = require('../controllers/clubs.controller');

const router = Router();

/**
 * @route   GET /api/clubs
 * @desc    List all clubs, including the current president's identity.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/', getClubs);

/**
 * @route   GET /api/clubs/:id
 * @desc    Fetch a single club with its president and recent demandes.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/:id', getClubById);

/**
 * @route   POST /api/clubs
 * @desc    Create a new club.
 * @access  Private (apply auth/role middleware as needed)
 */
router.post('/', createClub);

/**
 * @route   PUT /api/clubs/:id
 * @desc    Update an existing club (partial update).
 * @access  Private (apply auth/role middleware as needed)
 */
router.put('/:id', updateClub);

/**
 * @route   DELETE /api/clubs/:id
 * @desc    Delete a club.
 * @access  Private (apply auth/role middleware as needed)
 */
router.delete('/:id', deleteClub);


module.exports = router;