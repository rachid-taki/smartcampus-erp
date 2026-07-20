const express = require("express");

const router = express.Router();

const controller = require("../controllers/rolePermission.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

router.post(
  "/roles/:id/permissions",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  controller.assignPermissions,
);
// get role permissions
router.get(
  "/roles/:id/permissions",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  controller.getRolePermissions,
);
module.exports = router;
