const { Router } = require('express');
const {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
  getPresidents,
  getEtudiants,
} = require('../controllers/clubs.controller');

const router = Router();

// ==============================================================================
// ⚠️ ATTENTION : Les routes spécifiques DOIVENT être placées AVANT les routes /:id
// ==============================================================================

/**
 * @route   GET /api/clubs/etudiants
 * @desc    Fetch students (used for searching CNE when creating a club)
 */
router.get('/etudiants', getEtudiants);

/**
 * @route   GET /api/clubs/presidents
 * @desc    Fetch list of club presidents
 */
router.get('/presidents', getPresidents);

// ==============================================================================
// ROUTES CRUD CLASSIQUES
// ==============================================================================

/**
 * @route   GET /api/clubs
 * @desc    List all clubs, including the current president's identity.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/', getClubs);

/**
 * @route   POST /api/clubs
 * @desc    Create a new club.
 * @access  Private (apply auth/role middleware as needed)
 */
router.post('/', createClub);

/**
 * @route   GET /api/clubs/:id
 * @desc    Fetch a single club with its president and recent demandes.
 * @access  Private (apply auth/role middleware as needed)
 */
router.get('/:id', getClubById);

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