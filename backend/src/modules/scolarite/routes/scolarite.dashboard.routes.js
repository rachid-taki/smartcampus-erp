const express = require('express');
const multer = require('multer');
const {
  getDashboardStats,
  getUtilisateursPourNotification,
  getFilieres,
  sendNotification,
} = require('../controllers/scolarite.dashboard.controller');
const sallesCtrl = require('../controllers/salles.intelligente.controller');

const router = express.Router();

// Configuration du stockage temporaire pour les pièces jointes
const upload = multer({ dest: 'uploads/temp/' });

// ─── Dashboard ───
router.get('/dashboard/stats', getDashboardStats);

// ─── Notifications ───
router.get('/utilisateurs', getUtilisateursPourNotification);

// ✅ Ajout de upload.array('attachments') pour accepter les pièces jointes et le FormData
router.post('/notifications', upload.array('attachments'), sendNotification);

// ─── Filières ───
// Si sallesCtrl.getFilieres fonctionne déjà, vous pouvez le garder, sinon utilisez getFilieres
router.get('/filieres', getFilieres || sallesCtrl.getFilieres);

// ─── Salles Intelligentes ───
router.get('/salles/planning', sallesCtrl.getPlanning);
router.post('/salles/analyser-conflits', sallesCtrl.analyserConflits);

module.exports = router;