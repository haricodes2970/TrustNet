const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer = null;

// Starts an in-memory MongoDB instance and connects Mongoose to it. Call once
// per test file (e.g. in a top-level `before` hook), not per test case —
// starting the in-memory server has real startup cost.
async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

// Disconnects Mongoose and stops the in-memory server. Call once per test
// file (e.g. in a top-level `after` hook).
async function teardownTestDB() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

// Deletes all documents from every collection currently registered on the
// connection. Call between tests (e.g. in `afterEach`/`beforeEach`) to keep
// test cases isolated from each other's data.
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
}

module.exports = { setupTestDB, teardownTestDB, clearDatabase };
