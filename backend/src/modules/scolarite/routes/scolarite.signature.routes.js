const { Router } = require('express');

// 1. Import the Signature controller
const { signOfficialDocument } = require('../controllers/scolarite.signature.controller');

// 2. Import the new Official Documents controller
const { 
  getOfficialDocuments, 
  downloadOfficialDocument 
} = require('../controllers/scolarite.documents-officiels.controller');

const router = Router();

// --- Routes for Official Documents ---
router.get('/documents-officiels', getOfficialDocuments);
router.get('/documents-officiels/:id/download', downloadOfficialDocument);

// --- Route for Electronic Signature ---
router.post('/documents-officiels/:id/sign', signOfficialDocument);

module.exports = router;