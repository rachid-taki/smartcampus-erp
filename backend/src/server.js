require("dotenv").config();
require("./config/database");
require("./jobs/cleanupAssistant").startAssistantCleanup();

// 1. Import the existing app configuration
const app = require("./app");
const http = require("http");
const server = http.createServer(app);

const { initializeSocket } = require("./config/socket");
initializeSocket(server);

// 2. Import your new Module 5 routes
const scolariteDashboardRoutes = require('./modules/scolarite/routes/scolarite.dashboard.routes');
const rhEmployesRoutes = require('./modules/rh/routes/rh.employes.routes');

// 3. Mount the Module 5 routes onto the existing 'app'
app.use('/api/scolarite', scolariteDashboardRoutes);
app.use('/api/rh', rhEmployesRoutes);

const PORT = process.env.PORT || 3000;

// 4. Start the server (IMPORTANT : utiliser server.listen, pas app.listen)
server.listen(PORT, () => {
  console.log(`🚀 SmartCampus ERP API running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket actif sur ws://localhost:${PORT}`);
});