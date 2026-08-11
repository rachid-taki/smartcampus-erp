const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../../authentification/middlewares/auth.middleware");

router.get("/preferences", authMiddleware, notificationController.getPreferences);
router.patch("/preferences", authMiddleware, notificationController.updatePreferences);

module.exports = router;