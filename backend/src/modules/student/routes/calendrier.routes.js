const express = require("express");
const router = express.Router();
const authMiddleware = require("../../authentification/middlewares/auth.middleware");
const authorize = require("../../authentification/middlewares/authorize.middleware");
const calendrierController = require("../controllers/calendrier.controller");

router.get(
  "/calendrier",
  authMiddleware,
  authorize(["ETUDIANT"]),
  calendrierController.getCalendrier
);

module.exports = router;