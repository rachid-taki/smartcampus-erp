const { Router } = require('express');
const {
  getDocuments,
  createDocument,
  deleteDocument,
} = require('../controllers/scolarite.documents.controller');

const router = Router();

/**
 * @route   GET /api/scolarite/documents
 * @desc    List documents, optionally filtered by id_demande or
 *          id_reclamation. Ordered by date_upload descending.
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.get('/documents', getDocuments);

/**
 * @route   POST /api/scolarite/documents
 * @desc    Register a newly uploaded document's metadata. Requires exactly
 *          one of id_demande / id_reclamation (enforced app-side and by a
 *          DB-level exclusivity constraint).
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.post('/documents', createDocument);

/**
 * @route   DELETE /api/scolarite/documents/:id
 * @desc    Delete a document metadata record.
 * @access  Private (Scolarité staff — apply auth/role middleware as needed)
 */
router.delete('/documents/:id', deleteDocument);

module.exports = router;