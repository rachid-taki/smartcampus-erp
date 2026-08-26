const { Router } = require('express');
const {
  getConsultations,
  planifierConsultation,
} = require('../controllers/enseignant.consultations.controller');

const router = Router();

/**
 * @route   GET /api/enseignant/consultations
 * @desc    List all exam consultation requests, including the
 *          requesting student's identity. Ordered by date_demande desc.
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.get('/consultations', getConsultations);

/**
 * @route   PUT /api/enseignant/consultations/:id/planifier
 * @desc    Schedule or update the status of an exam consultation request.
 * @access  Private (Teacher — apply auth/role middleware as needed)
 */
router.put('/consultations/:id/planifier', planifierConsultation);

module.exports = router;