const { Router } = require('express');

// 1. Il manquait l'import de "deleteAbsence" ici :
const {
  getAbsences,
  updateAbsenceStatut,
  deleteAbsence 
} = require('../controllers/enseignant.absences.controller');

const authMiddleware = require('../../authentification/middlewares/auth.middleware');

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware.verifyToken || authMiddleware);

/**
 * @route   GET /api/enseignant/absences
 * @desc    Liste les absences des étudiants pour les cours de l'enseignant
 * @access  Private (Teacher)
 */
router.get('/', getAbsences);

/**
 * @route   PUT /api/enseignant/absences/:id/statut
 * @desc    Mettre à jour le statut d'une absence
 * @access  Private (Teacher)
 */
router.put('/:id/statut', updateAbsenceStatut);

/**
 * @route   DELETE /api/enseignant/absences/:id
 * @desc    Supprimer une absence
 * @access  Private (Teacher)
 */
router.delete('/:id', deleteAbsence);

module.exports = router;