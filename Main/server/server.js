const dns = require("dns");

// Force Node.js to use Google DNS (workaround for this laptop)
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./src/config/database");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`TrustNet server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
