const express = require('express');
const {
  getDashboardStats,
  getUtilisateursPourNotification,
  sendNotification,
} = require('../controllers/scolarite.dashboard.controller');
const sallesCtrl = require('../controllers/salles.intelligente.controller');

const router = express.Router();

// ─── Dashboard ───
router.get('/dashboard/stats', getDashboardStats);

// ─── Notifications ───
router.get('/utilisateurs', getUtilisateursPourNotification);
router.post('/notifications', sendNotification);

// ─── Salles Intelligentes ───
router.post('/salles/import-edt', sallesCtrl.uploadArray, sallesCtrl.importEDT);
router.get('/salles/planning', sallesCtrl.getPlanning);
router.post('/salles/analyser-conflits', sallesCtrl.analyserConflits);
router.get('/filieres', sallesCtrl.getFilieres);

// ⚠️ Supprimé : router.post('/salles/test-pdf', ...)
// Cette route de debug causait l'erreur et n'est pas nécessaire.

module.exports = router;