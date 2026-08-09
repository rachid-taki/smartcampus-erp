const express = require("express");
const router = express.Router();

const messagingController = require("../controllers/messaging.controller");
const authMiddleware = require("../../authentification/middlewares/auth.middleware");
const authorize = require("../../authentification/middlewares/authorize.middleware");
const upload = require("../../student/middlewares/upload.middleware");

router.get(
    "/conversations",
    authMiddleware,
    authorize(["SCOLARITE"]),
    messagingController.getAllConversations
);

router.get(
    "/conversations/:id",
    authMiddleware,
    authorize(["SCOLARITE"]),
    messagingController.getConversationMessages
);

router.post(
    "/conversations/:id",
    authMiddleware,
    authorize(["SCOLARITE"]),
    upload.array("pieces", 5),
    messagingController.sendMessage
);

router.patch(
    "/conversations/:id/read",
    authMiddleware,
    authorize(["SCOLARITE"]),
    messagingController.markConversationRead
);

module.exports = router;