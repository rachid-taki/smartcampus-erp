

const express = require("express");
const cors = require("cors");

//const authRoutes = require("./modules/authentification/routes/auth.routes");

const app = express();
//const permissionRoutes = require("./modules/authentification/routes/permission.routes");
//const rolePermissionRoutes = require("./modules/authentification/routes/rolePermission.routes");
//const profileRoutes = require("./modules/authentification/routes/profile.routes");
//const auditRoutes = require("./modules/authentification/routes/audit.routes");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to SmartCampus ERP API",
  });
});

// 2. Import your Modules
const scolariteDashboardRoutes = require('./modules/scolarite/routes/scolarite.dashboard.routes');
const scolariteDemandesRoutes = require('./modules/scolarite/routes/scolarite.demandes.routes');
const scolariteWorkflowsRoutes = require('./modules/scolarite/routes/scolarite.workflows.routes');
const scolariteDocumentsRoutes = require('./modules/scolarite/routes/scolarite.documents.routes');
const scolaritePdfRoutes = require('./modules/scolarite/routes/scolarite.pdf.routes');
const scolariteSignatureRoutes = require('./modules/scolarite/routes/scolarite.signature.routes');
const rhEmployesRoutes = require('./modules/rh/routes/rh.employes.routes');
const rhCongesRoutes = require('./modules/rh/routes/rh.conges.routes');
const rhAttestationsRoutes = require('./modules/rh/routes/rh.attestations.routes');
const rhHeuresRoutes = require('./modules/rh/routes/rh.heures.routes');
const rhDashboardRoutes = require('./modules/rh/routes/rh.dashboard.routes');
const enseignantReclamationsRoutes = require('./modules/enseignant/routes/enseignant.reclamations.routes');
const enseignantAbsencesRoutes = require('./modules/enseignant/routes/enseignant.absences.routes');
const enseignantConsultationsRoutes = require('./modules/enseignant/routes/enseignant.consultations.routes');
const clubsRoutes = require('./modules/clubs/routes/clubs.routes');
const presidentsRoutes = require('./modules/clubs/routes/presidents.routes');
const reservationsRoutes = require('./modules/clubs/routes/reservations.routes');
const evenementsRoutes = require('./modules/clubs/routes/evenements.routes');
const presencesRoutes = require('./modules/clubs/routes/presences.routes');
const alertesRoutes = require('./modules/clubs/routes/alertes.routes');
const clubsDashboardRoutes = require('./modules/clubs/routes/dashboard.routes');
const parametresRoutes = require('./modules/configuration/routes/parametres.routes');
const calendriersRoutes = require('./modules/configuration/routes/calendriers.routes');
const sessionsRoutes = require('./modules/clubs/routes/sessions.routes');

// 3. Mount the routes
app.use('/api/scolarite', scolariteDashboardRoutes);
app.use('/api/scolarite', scolariteDemandesRoutes);
app.use('/api/scolarite', scolariteWorkflowsRoutes);
app.use('/api/scolarite', scolariteDocumentsRoutes);
app.use('/api/scolarite', scolaritePdfRoutes);
app.use('/api/scolarite', scolariteSignatureRoutes);
app.use('/api/rh', rhEmployesRoutes);
app.use('/api/rh', rhCongesRoutes);
app.use('/api/rh', rhAttestationsRoutes);
app.use('/api/rh', rhHeuresRoutes);
app.use('/api/rh', rhDashboardRoutes);
app.use('/api/enseignant', enseignantReclamationsRoutes);
app.use('/api/enseignant', enseignantAbsencesRoutes);
app.use('/api/enseignant', enseignantConsultationsRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/presidents', presidentsRoutes);
app.use('/api', reservationsRoutes);
app.use('/api/evenements', evenementsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/presences', presencesRoutes);
app.use('/api/alertes', alertesRoutes);
app.use('/api/clubs-dashboard', clubsDashboardRoutes);
app.use('/api/parametres', parametresRoutes);
app.use('/api/calendriers', calendriersRoutes);

//app.use("/api/permissions", permissionRoutes);
//app.use("/api/auth", authRoutes);
//app.use("/api", rolePermissionRoutes);
//app.use("/api/profile", profileRoutes);
//app.use("/api/audit", auditRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});


module.exports = app;