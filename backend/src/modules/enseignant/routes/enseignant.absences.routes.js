const { Router } = require('express');
const {
  getAbsences,
  updateAbsenceStatut,
} = require('../controllers/enseignant.absences.controller');

const router = Router();

/**
 * @route   GET /api/enseignant/absences
 * @desc    List all absences, including student identity and
 *          session/course context. Ordered by date_heure descending.
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.get('/absences', getAbsences);

/**
 * @route   PUT /api/enseignant/absences/:id/statut
 * @desc    Update the status of an absence, with an optional teacher remark.
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.put('/absences/:id/statut', updateAbsenceStatut);

module.exports = router;