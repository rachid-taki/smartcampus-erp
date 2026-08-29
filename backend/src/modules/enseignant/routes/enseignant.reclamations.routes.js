const { Router } = require('express');
const {
  getReclamations,
  repondreReclamation,
} = require('../controllers/enseignant.reclamations.controller');

// 1. Importer le middleware d'authentification
const authMiddleware = require('../../authentification/middlewares/auth.middleware');

const router = Router();

// 2. Appliquer le middleware d'authentification pour sécuriser ces routes
router.use(authMiddleware.verifyToken || authMiddleware);

/**
 * @route   GET /api/enseignant/reclamations
 * @desc    List all grade complaints (type: 'Note'), including the
 *          student's identity and the concerned module.
 * @access  Private (Teacher)
 */
router.get('/reclamations', getReclamations);

/**
 * @route   PUT /api/enseignant/reclamations/:id/repondre
 * @desc    Respond to a grade complaint
 * @access  Private (Teacher)
 */
router.put('/reclamations/:id/repondre', repondreReclamation);

module.exports = router;