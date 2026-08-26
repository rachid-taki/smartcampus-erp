const { Router } = require('express');
const {
  getDemandes,
  updateDemandeStatus,
  downloadDocumentOfficiel,  
  uploadDocument,            
} = require('../controllers/scolarite.demandes.controller');

const router = Router();

/**
 * @route   GET /api/scolarite/demandes
 * @desc    List administrative requests with type_demande included
 */
router.get('/demandes', getDemandes);

/**
 * @route   PATCH /api/scolarite/demandes/:id/status
 * @desc    Update statut + optionnellement upload d'un document officiel
 *          Accepte JSON ET multipart/form-data
 */
router.patch(
  '/demandes/:id/status',
  
  
  (req, res, next) => {
    
    if (req.headers['content-type']?.includes('application/json')) {
      return require('express').json()(req, res, next);
    }
    next();
  },
  uploadDocument,       
  updateDemandeStatus
);

/**
 * @route   GET /api/scolarite/demandes/:id/document
 * @desc    Download the latest official document for this demande
 */
router.get('/demandes/:id/document', downloadDocumentOfficiel);


module.exports = router;