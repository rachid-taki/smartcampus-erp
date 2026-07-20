

const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/authentification/routes/auth.routes");

const app = express();
const permissionRoutes = require("./modules/authentification/routes/permission.routes");
const rolePermissionRoutes = require("./modules/authentification/routes/rolePermission.routes");
const profileRoutes = require("./modules/authentification/routes/profile.routes");
const auditRoutes = require("./modules/authentification/routes/audit.routes");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to SmartCampus ERP API",
  });
});



app.use("/api/permissions", permissionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", rolePermissionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/audit", auditRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});


module.exports = app;