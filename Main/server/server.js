
require("dotenv").config();
const { MongoMemoryServer } = require("mongodb-memory-server");
const net = require("net");

async function startServer() {
  if (process.env.MONGO_URI && (process.env.MONGO_URI.includes("127.0.0.1") || process.env.MONGO_URI.includes("localhost"))) {
    const isLocalMongoRunning = await new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(1000);
      client.once("connect", () => {
        client.destroy();
        resolve(true);
      });
      client.once("timeout", () => {
        client.destroy();
        resolve(false);
      });
      client.once("error", () => {
        resolve(false);
      });
      client.connect(27017, "127.0.0.1");
    });

    if (!isLocalMongoRunning) {
      console.log("Local MongoDB on port 27017 is not running. Starting in-memory MongoDB server...");
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      console.log(`In-memory MongoDB started at: ${memoryUri}`);
      process.env.MONGO_URI = memoryUri;
    }
  }

  // Load app and config after MONGO_URI is resolved/overridden
  const app = require("./app");
  const connectDatabase = require("./src/config/database");
  const seedDatabase = require("./src/config/seed");
  const PORT = process.env.PORT || 5000;

  try {
    await connectDatabase();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`TrustNet server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
}

startServer();

