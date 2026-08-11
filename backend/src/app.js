const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/authentification/routes/auth.routes");

const app = express();
const permissionRoutes = require("./modules/authentification/routes/permission.routes");
const rolePermissionRoutes = require("./modules/authentification/routes/rolePermission.routes");
const profileRoutes = require("./modules/authentification/routes/profile.routes");
const auditRoutes = require("./modules/authentification/routes/audit.routes");
const studentRoutes = require("./modules/student/routes/student.routes");
const assistantRoutes = require("./modules/assistant/routes/assistant.routes");
const notificationRoutes = require("./modules/notification/routes/notification.routes");
const superadminRoutes = require("./modules/superadmin/routes/superadmin.routes");


const scolariteMessagingRoutes = require("./modules/scolarite/routes/messaging.routes");

const path = require("path");

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
app.use("/api/student", studentRoutes);
app.use("/api/student/assistant", assistantRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/superadmin", superadminRoutes);

app.use("/api/scolarite/messages", scolariteMessagingRoutes);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
