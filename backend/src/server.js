// require("./config/database");
// require("dotenv").config();




// const app = require("./app");
// const http = require("http");
// const server = http.createServer(app); 
// const { initializeSocket } = require("./config/socket");

// initializeSocket(server);


// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`SmartCampus ERP API running on http://localhost:${PORT}`);
//       console.log(` WebSocket actif`);

// });

require("dotenv").config();
require("./config/database");
require("./jobs/cleanupAssistant").startAssistantCleanup();

const app = require("./app");
const http = require("http");
const server = http.createServer(app);

const { initializeSocket } = require("./config/socket");
initializeSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 SmartCampus ERP API sur http://localhost:${PORT}`);
    console.log(`WebSocket actif`);
});

