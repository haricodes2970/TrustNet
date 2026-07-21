// Phase 2, Section 1: Workspace Permission Resolution.
// Verifies workspaceService.resolveWorkspaceAccess() against a real MongoDB
// instance. Out of scope: validators, controllers, routes, performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const workspaceService = require("../../src/services/workspaceService");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

test("founder resolves to role 'owner'", async () => {
  const fx = await createCollaborationFixture();
  const access = await workspaceService.resolveWorkspaceAccess(fx.workspace._id, fx.founder.user._id);
  assert.equal(access.role, "owner");
});

test("active Team admin resolves to role 'admin'", async () => {
  const fx = await createCollaborationFixture();
  const access = await workspaceService.resolveWorkspaceAccess(fx.workspace._id, fx.adminMember.user._id);
  assert.equal(access.role, "admin");
});

test("active Team member resolves to role 'contributor'", async () => {
  const fx = await createCollaborationFixture();
  const access = await workspaceService.resolveWorkspaceAccess(
    fx.workspace._id,
    fx.contributorMember.user._id
  );
  assert.equal(access.role, "contributor");
});

test("pending (not-yet-active) Team member is denied", async () => {
  const fx = await createCollaborationFixture();
  const access = await workspaceService.resolveWorkspaceAccess(fx.workspace._id, fx.pendingMember.user._id);
  assert.equal(access.role, null);
});

test("unrelated user (no Startup/Team/Workspace relation) is denied", async () => {
  const fx = await createCollaborationFixture();
  const access = await workspaceService.resolveWorkspaceAccess(fx.workspace._id, fx.unrelatedUser.user._id);
  assert.equal(access.role, null);
});

test("resolving access against a non-existent (but validly formatted) workspace id is denied, not an error", async () => {
  const fx = await createCollaborationFixture();
  const nonExistentId = new mongoose.Types.ObjectId();
  const access = await workspaceService.resolveWorkspaceAccess(nonExistentId, fx.founder.user._id);
  assert.equal(access.role, null);
});
