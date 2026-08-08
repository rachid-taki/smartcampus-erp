const { Router } = require('express');
const {
  getAttestations,
  createAttestation,
  updateAttestationStatut,
  generateAttestationPdf,
} = require('../controllers/rh.attestations.controller');

const router = Router();

/**
 * @route   GET /api/rh/attestations
 * @desc    List all attestation requests (Attestation_Travail,
 *          Attestation_Salaire), including employee and handling
 *          HR staff identities.
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.get('/attestations', getAttestations);

/**
 * @route   POST /api/rh/attestations
 * @desc    Submit a new attestation request. Status defaults to 'Soumise'.
 * @access  Private (Employee or RH staff — apply auth/role middleware as needed)
 */
router.post('/attestations', createAttestation);

/**
 * @route   PUT /api/rh/attestations/:id/statut
 * @desc    Update the status of an attestation request (HR validation/rejection).
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.put('/attestations/:id/statut', updateAttestationStatut);

/**
 * @route   GET /api/rh/attestations/:id/pdf
 * @desc    Generate and download a formal PDF attestation document.
 * @access  Private (RH staff or the concerned employee — apply auth as needed)
 */
router.get('/attestations/:id/pdf', generateAttestationPdf);

module.exports = router;