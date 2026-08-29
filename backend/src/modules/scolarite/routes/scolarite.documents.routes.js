const { Router } = require('express');
const { 
  getDocuments, 
  createDocument, 
  deleteDocument, 
  downloadDocument, 
  uploadMiddleware 
} = require('../controllers/scolarite.documents.controller');

const router = Router();

// 1. Récupérer les documents
router.get('/documents', getDocuments);

// 2. 🚨 CRÉATION : Le middleware 'uploadMiddleware' DOIT être placé avant 'createDocument'
router.post('/documents', uploadMiddleware, createDocument);

// 3. Supprimer un document
router.delete('/documents/:id', deleteDocument);

// 4. Télécharger un document soumis standard
router.get('/documents/:id/download', downloadDocument);

module.exports = router;