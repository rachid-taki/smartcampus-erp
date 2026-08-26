const { Router } = require('express');
const {
  getReclamations,
  repondreReclamation,
} = require('../controllers/enseignant.reclamations.controller');

const router = Router();

/**
 * @route   GET /api/enseignant/reclamations
 * @desc    List all grade complaints (type: 'Note'), including the
 *          student's identity and the concerned module.
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.get('/reclamations', getReclamations);

/**
 * @route   PUT /api/enseignant/reclamations/:id/repondre
 * @desc    Respond to a grade complaint (statut -> Resolue | Rejetee,
 *          records reponse text, optionally assigns traiteePar, and
 *          refreshes dateMiseAJour).
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.put('/reclamations/:id/repondre', repondreReclamation);

module.exports = router;