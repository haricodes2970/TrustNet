// Infrastructure smoke test only — proves the integration-test harness
// itself works (DB connect/disconnect, cleanup between tests, authenticated
// test user creation). Deliberately does NOT test any collaboration
// permission logic (resolveWorkspaceAccess, canMutateTask, etc.) — that is
// explicitly out of scope for this phase.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const jwtConfig = require("../../src/config/jwt");
const User = require("../../src/models/User");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

test("setupTestDB connects mongoose to the in-memory MongoDB instance", () => {
  assert.equal(mongoose.connection.readyState, 1);
});

test("a document can be written and read back", async () => {
  await User.create({ fullName: "Infra Check", username: "infra_check_1", email: "infra1@example.com" });
  const count = await User.countDocuments();
  assert.equal(count, 1);
});

test("clearDatabase removed the previous test's data", async () => {
  const count = await User.countDocuments();
  assert.equal(count, 0);
});

test("createAuthenticatedTestUser persists a user and issues a token auth.js can verify", async () => {
  const { user, token } = await createAuthenticatedTestUser();

  assert.ok(user._id);
  const persisted = await User.findById(user._id).lean();
  assert.ok(persisted);

  const payload = jwt.verify(token, jwtConfig.accessSecret);
  assert.equal(payload.email, user.email);
  assert.equal(payload.sub, user._id.toString());
});

test("createAuthenticatedTestUser accepts overrides (e.g. role)", async () => {
  const { user } = await createAuthenticatedTestUser({ role: "admin" });
  assert.equal(user.role, "admin");
});
