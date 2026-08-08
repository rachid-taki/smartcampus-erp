const { Router } = require('express');
const { generateDemandePdf } = require('../controllers/scolarite.pdf.controller');

const router = Router();

/**
 * @route   GET /api/scolarite/demandes/:id/pdf
 * @desc    Generate and download a PDF attestation/receipt for a specific
 *          demande, including student identity and request details.
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.get('/demandes/:id/pdf', generateDemandePdf);

module.exports = router;