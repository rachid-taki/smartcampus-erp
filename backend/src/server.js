require("dotenv").config();
require("./config/database");

// 1. Import the existing app configuration
const app = require("./app");

// 2. Import your new Module 5 routes
const scolariteDashboardRoutes = require('./modules/scolarite/routes/scolarite.dashboard.routes');

// 3. Mount the Module 5 routes onto the existing 'app'
app.use('/api/scolarite', scolariteDashboardRoutes);

const PORT = process.env.PORT || 3000;

// 4. Start the server
app.listen(PORT, () => {
  console.log(`SmartCampus ERP API running on http://localhost:${PORT}`);
});