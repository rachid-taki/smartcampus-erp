const express = require("express");

const router = express.Router();

const authMiddleware = require("../../authentification/middlewares/auth.middleware");

const studentController = require("../controllers/student.controller");

router.get(
    "/profile",
    authMiddleware,
    studentController.getProfile
);

module.exports = router;