const { Router } = require('express');
const {
  getParametres,
  getAuditLogs,
  getParametreByCle,
  updateParametre
} = require('../controllers/parametres.controller');

const router = Router();

// Routes pour les paramètres système
router.get('/', getParametres);

// ⚠️ Placer cette route AVANT /:cle
router.get('/audit/logs', getAuditLogs); 

router.get('/:cle', getParametreByCle);
router.put('/:cle', updateParametre);

module.exports = router;