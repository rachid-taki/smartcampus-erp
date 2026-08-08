const { Router } = require('express');
const {
  getEmployes,
  getEmployeById,
  createEmploye,
  updateEmploye,
  deleteEmploye,
} = require('../controllers/rh.employes.controller');

const router = Router();

/**
 * @route   GET /api/rh/employes
 * @desc    List all employees, joined with their utilisateur record.
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.get('/employes', getEmployes);

/**
 * @route   GET /api/rh/employes/:id
 * @desc    Fetch a single employee by id, joined with utilisateur.
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.get('/employes/:id', getEmployeById);

/**
 * @route   POST /api/rh/employes
 * @desc    Onboard a new employee (creates utilisateur + employe
 *          atomically in a transaction).
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.post('/employes', createEmploye);

/**
 * @route   PUT /api/rh/employes/:id
 * @desc    Update employee details across utilisateur and employe
 *          tables simultaneously.
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.put('/employes/:id', updateEmploye);

/**
 * @route   DELETE /api/rh/employes/:id
 * @desc    Soft-delete an employee (statut -> 'Inactif', actif -> false).
 * @access  Private (RH staff — apply auth/role middleware as needed)
 */
router.delete('/employes/:id', deleteEmploye);

module.exports = router;