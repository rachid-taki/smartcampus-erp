const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../../authentification/middlewares/auth.middleware");

router.get("/", authMiddleware.verifyToken || authMiddleware, notificationController.getNotifications);

router.get("/preferences", authMiddleware, notificationController.getPreferences);
router.patch("/preferences", authMiddleware, notificationController.updatePreferences);


router.patch("/:id/lu", authMiddleware, notificationController.markAsRead);
router.patch("/marquer-tout-lu", authMiddleware, notificationController.markAllAsRead);
module.exports = router;