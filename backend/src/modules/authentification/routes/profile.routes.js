const express = require("express");

const router = express.Router();

const profileController = require("../controllers/profile.controller");

const authMiddleware = require("../middlewares/auth.middleware");

router.get("/", authMiddleware, profileController.getProfile);
// update profile
router.put("/", authMiddleware, profileController.updateProfile);
// change password
router.put("/password", authMiddleware, profileController.changePassword);
module.exports = router;
