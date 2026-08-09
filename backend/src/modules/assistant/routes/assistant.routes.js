const express = require("express");
const router = express.Router();
const assistantController = require("../controllers/assistant.controller");
const authMiddleware = require("../../authentification/middlewares/auth.middleware");
const authorize = require("../../authentification/middlewares/authorize.middleware");


router.post("/chat", authMiddleware, authorize(["ETUDIANT"]), assistantController.chat);
router.get("/conversations", authMiddleware, authorize(["ETUDIANT"]), assistantController.getConversations);
router.get("/conversations/:id/messages", authMiddleware, authorize(["ETUDIANT"]), assistantController.getMessages);

module.exports = router;