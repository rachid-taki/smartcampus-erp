const { Router } = require('express');
const {
  getPresences,
  createPresence,
  updatePresenceStatut
} = require('../controllers/presences.controller');

const router = Router();

router.get('/', getPresences);
router.post('/', createPresence);
router.put('/:id/statut', updatePresenceStatut);

module.exports = router;