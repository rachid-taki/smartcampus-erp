const express = require("express");

const router = express.Router();

const auditController = require("../controllers/audit.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

router.get(
  "/",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  auditController.getAllLogs,
);

router.get(
  "/:id",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  auditController.getLogById,
);

module.exports = router;
