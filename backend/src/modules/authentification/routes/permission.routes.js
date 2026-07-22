const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const hasPermission = require("../middlewares/permission.middleware");

// get all permissions
router.get(
  "/",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  permissionController.getAllPermissions,
);

// test
// router.get("/test", authMiddleware, hasPermission("LOGIN"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Vous avez cette permission.",
//   });
// });
// get permissions by id
router.get(
  "/:id",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  permissionController.getPermissionById,
);
// creat permissions by super admin
router.post(
  "/",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  permissionController.createPermission,
);

// update permission by id
router.put(
  "/:id",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  permissionController.updatePermission,
);
// delet une permission par le super admin
router.delete(
  "/:id",
  authMiddleware,
  authorize("SUPER_ADMIN"),
  permissionController.deletePermission,
);

module.exports = router;
