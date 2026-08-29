const { Router } = require('express');
const multer = require('multer');
const { sendRhMessage } = require('../controllers/rh.communication.controller');

const router = Router();

// Configuration de Multer pour stocker les fichiers en RAM (MemoryStorage)
// C'est beaucoup plus performant et propre pour les transférer directement à Nodemailer
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // Limite à 15 Mo par fichier
  }
});

/**
 * @route   POST /api/rh/communications/send
 * @desc    Envoie un email avec pièces jointes aux employés
 * @access  Private (RH staff)
 * 
 * L'upload.array('attachments', 5) permet d'accepter jusqu'à 5 fichiers
 * sous le nom de champ 'attachments' depuis le Frontend.
 */
router.post('/send', upload.array('attachments', 5), sendRhMessage);

module.exports = router;