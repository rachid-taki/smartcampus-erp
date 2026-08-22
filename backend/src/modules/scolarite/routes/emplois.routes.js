const express = require('express');
const router = express.Router();

const { 
  uploadArray, 
  extractEDT,     
  confirmEDT,     
  getPlanning, 
  analyserConflits, 
  getFilieres,
  getPeriodesAcademiques,
  mergeSalles
} = require('../controllers/salles.intelligente.controller');

router.get('/planning', getPlanning);
router.get('/filieres', getFilieres);
router.post('/merge', mergeSalles);

// Ces routes vont intercepter /api/scolarite/emplois/extract-edt
router.get('/periodes', getPeriodesAcademiques);
router.post('/extract-edt', uploadArray, extractEDT);
router.post('/confirm-edt', confirmEDT);
router.post('/analyser-conflits', analyserConflits);

module.exports = router;