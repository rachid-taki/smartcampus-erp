const express = require("express");
const router = express.Router();
const superadminController = require("../controllers/superadmin.controller");
const authMiddleware = require("../../authentification/middlewares/auth.middleware");
const authorize = require("../../authentification/middlewares/authorize.middleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });


// Toutes les routes nécessitent le rôle SUPER_ADMIN
router.use(authMiddleware);
router.use(authorize(["SUPER_ADMIN"]));

// Dashboard
router.get("/stats", superadminController.getDashboardStats);


// Utilisateurs
router.get("/users", superadminController.getUsers);
router.post("/users", superadminController.createUser);
router.patch("/users/:id", superadminController.updateUser);
router.patch("/users/:id/toggle-status", superadminController.toggleUserStatus);
router.post(
  "/users/:id/reset-password",
  superadminController.resetUserPassword,
);

// Rôles
router.get("/roles", superadminController.getRoles);
router.post("/roles", superadminController.createRole);

// Permissions
router.get("/permissions", superadminController.getPermissions);
router.get("/roles/:id/permissions", superadminController.getRolePermissions);
router.put(
  "/roles/:id/permissions",
  superadminController.updateRolePermissions,
);
router.get("/audit", superadminController.getAuditLogs);
router.get("/audit/stats", superadminController.getAuditStats);


router.post("/users/bulk/extract", upload.single("file"), superadminController.extractUsersFromFile);
router.post("/users/bulk/create", superadminController.bulkCreateUsers);
router.get("/activity", superadminController.getRecentActivity);

module.exports = router;
