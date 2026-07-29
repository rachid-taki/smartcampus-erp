const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const authorize = require("../middlewares/role.middleware");

router.post("/register", authController.register);

router.post("/login", authController.login);

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.post("/forgot-password", authController.forgotPassword);

router.post("/verify-otp", authController.verifyOtp);

router.post("/reset-password", authController.resetPassword);

router.get("/admin", authMiddleware, authorize("SUPER_ADMIN"), (req, res) => {
  res.json({
    success: true,
    message: "Bienvenue Super Admin !",
  });
});

module.exports = router;
