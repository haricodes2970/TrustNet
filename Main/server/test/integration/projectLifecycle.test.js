// Project module integration tests. Runs the real Express app over HTTP
// against an in-memory MongoDB instance. Complements the existing
// service-level test/integration/projectAuthorization.test.js (workspace-
// access resolution, list-filter authorization) - this file exercises
// routes/controller/validators plus everything added in this phase:
// archive/restore lifecycle, platform-admin override, duplicate-name
// prevention, pagination/search, and relationship-chain integrity.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const Workspace = require("../../src/models/Workspace");
const Startup = require("../../src/models/Startup");
const Task = require("../../src/models/Task");

let server;
let baseUrl;

before(async () => {
  await setupTestDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function makeAdmin() {
  return createAuthenticatedTestUser({ role: "admin" });
}

function payload(workspaceId, overrides = {}) {
  return {
    workspaceId: String(workspaceId),
    name: `Project ${Date.now()}${Math.floor(Math.random() * 1e6)}`,
    description: "A test project.",
    ...overrides,
  };
}

// --- Create + validation ---

test("create rejects unauthenticated", async () => {
  const { status } = await api("/api/v1/projects", { method: "POST", body: { workspaceId: "x", name: "P" } });
  assert.equal(status, 401);
});

test("create rejects a name shorter than 2 chars (validation)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api("/api/v1/projects", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.workspace._id, { name: "A" }),
  });
  assert.equal(status, 400);
});

test("create returns 404 for a nonexistent workspace", async () => {
  const fx = await createCollaborationFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const { status } = await api("/api/v1/projects", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fakeId),
  });
  assert.equal(status, 404);
});

test("create is rejected against an archived workspace with 409", async () => {
  const fx = await createCollaborationFixture();
  await Workspace.findByIdAndUpdate(fx.workspace._id, { isArchived: true });
  const { status } = await api("/api/v1/projects", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.workspace._id),
  });
  assert.equal(status, 409);
});

test("create rejects a duplicate name within the same workspace (409)", async () => {
  const fx = await createCollaborationFixture();
  const first = payload(fx.workspace._id, { name: "Duplicate Project" });
  const created = await api("/api/v1/projects", { method: "POST", token: fx.founder.token, body: first });
  assert.equal(created.status, 201);

  const { status, json } = await api("/api/v1/projects", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.workspace._id, { name: "duplicate project" }), // case-insensitive
  });
  assert.equal(status, 409);
  assert.match(json.message, /already exists/i);
});

test("the same project name is allowed again once the original is archived", async () => {
  const fx = await createCollaborationFixture();
  const first = await api("/api/v1/projects", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.workspace._id, { name: "Reusable Name" }),
  });
  await api(`/api/v1/projects/${first.json.data._id}`, { method: "DELETE", token: fx.founder.token });

  const { status } = await api("/api/v1/projects", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.workspace._id, { name: "Reusable Name" }),
  });
  assert.equal(status, 201);
});

// --- Permission matrix ---

test("permission matrix: founder and workspace-admin-tier member can create, contributor cannot, unrelated user cannot", async () => {
  const fx = await createCollaborationFixture();

  const byFounder = await api("/api/v1/projects", { method: "POST", token: fx.founder.token, body: payload(fx.workspace._id, { name: "By Founder" }) });
  assert.equal(byFounder.status, 201);

  const byAdmin = await api("/api/v1/projects", { method: "POST", token: fx.adminMember.token, body: payload(fx.workspace._id, { name: "By Admin" }) });
  assert.equal(byAdmin.status, 201);

  const byContributor = await api("/api/v1/projects", { method: "POST", token: fx.contributorMember.token, body: payload(fx.workspace._id, { name: "By Contributor" }) });
  assert.equal(byContributor.status, 403);

  const byUnrelated = await api("/api/v1/projects", { method: "POST", token: fx.unrelatedUser.token, body: payload(fx.workspace._id, { name: "By Unrelated" }) });
  assert.equal(byUnrelated.status, 403);
});

test("permission matrix: a platform admin can create/update/archive/restore in a workspace they have no role in", async () => {
  const fx = await createCollaborationFixture();
  const admin = await makeAdmin();

  const created = await api("/api/v1/projects", { method: "POST", token: admin.token, body: payload(fx.workspace._id, { name: "Admin Project" }) });
  assert.equal(created.status, 201);
  const id = created.json.data._id;

  const updated = await api(`/api/v1/projects/${id}`, { method: "PUT", token: admin.token, body: { description: "edited" } });
  assert.equal(updated.status, 200);

  const archived = await api(`/api/v1/projects/${id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);

  const restored = await api(`/api/v1/projects/${id}/restore`, { method: "POST", token: admin.token });
  assert.equal(restored.status, 200);
});

test("permission matrix: a contributor can view but not update", async () => {
  const fx = await createCollaborationFixture();
  const view = await api(`/api/v1/projects/${fx.project._id}`, { token: fx.contributorMember.token });
  assert.equal(view.status, 200);

  const update = await api(`/api/v1/projects/${fx.project._id}`, {
    method: "PUT",
    token: fx.contributorMember.token,
    body: { description: "should fail" },
  });
  assert.equal(update.status, 403);
});

test("get project returns 404 for a nonexistent id, 403 for an unrelated user", async () => {
  const fx = await createCollaborationFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const notFound = await api(`/api/v1/projects/${fakeId}`, { token: fx.founder.token });
  assert.equal(notFound.status, 404);

  const unauthorized = await api(`/api/v1/projects/${fx.project._id}`, { token: fx.unrelatedUser.token });
  assert.equal(unauthorized.status, 403);
});

// --- Cross-workspace / cross-startup isolation ---

test("a member of workspace A cannot view, update or list into workspace B's project (cross-startup isolation)", async () => {
  const fxA = await createCollaborationFixture();
  const fxB = await createCollaborationFixture();

  const view = await api(`/api/v1/projects/${fxB.project._id}`, { token: fxA.founder.token });
  assert.equal(view.status, 403);

  const update = await api(`/api/v1/projects/${fxB.project._id}`, {
    method: "PUT",
    token: fxA.founder.token,
    body: { description: "cross-tenant edit" },
  });
  assert.equal(update.status, 403);

  const listFiltered = await api(`/api/v1/projects?workspaceId=${fxB.workspace._id}`, { token: fxA.founder.token });
  assert.equal(listFiltered.status, 403);
});

// --- Lifecycle: archive/restore ---

test("archive hides a project from the default list; restore brings it back and allows edits again", async () => {
  const fx = await createCollaborationFixture();

  const archived = await api(`/api/v1/projects/${fx.project._id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);

  const list = await api("/api/v1/projects", { token: fx.founder.token });
  assert.ok(!list.json.data.some((p) => p._id === String(fx.project._id)));

  const blockedUpdate = await api(`/api/v1/projects/${fx.project._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { description: "should fail while archived" },
  });
  assert.equal(blockedUpdate.status, 409);

  const restored = await api(`/api/v1/projects/${fx.project._id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);

  const listAfterRestore = await api("/api/v1/projects", { token: fx.founder.token });
  assert.ok(listAfterRestore.json.data.some((p) => p._id === String(fx.project._id)));

  const editAfterRestore = await api(`/api/v1/projects/${fx.project._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { description: "edited after restore" },
  });
  assert.equal(editAfterRestore.status, 200);
});

test("restoring a project is blocked while its parent workspace is still archived", async () => {
  const fx = await createCollaborationFixture();
  await api(`/api/v1/projects/${fx.project._id}`, { method: "DELETE", token: fx.founder.token });
  await Workspace.findByIdAndUpdate(fx.workspace._id, { isArchived: true });

  const { status } = await api(`/api/v1/projects/${fx.project._id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(status, 409);
});

// --- Edge cases: workspace archived / startup soft-deleted ---

test("soft-deleting the startup cascades to the workspace, which blocks new project creation", async () => {
  const fx = await createCollaborationFixture();
  await api(`/api/v1/startups/${fx.startup._id}`, { method: "DELETE", token: fx.founder.token });

  const { status } = await api("/api/v1/projects", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.workspace._id, { name: "Should Fail" }),
  });
  assert.equal(status, 409);
});

test("an existing project under a soft-deleted startup's workspace is still viewable (read access is not cascaded, only writes)", async () => {
  const fx = await createCollaborationFixture();
  await Startup.findByIdAndUpdate(fx.startup._id, { deletedAt: new Date() });
  await Workspace.findByIdAndUpdate(fx.workspace._id, { isArchived: true }); // mirrors the real cascade

  const { status } = await api(`/api/v1/projects/${fx.project._id}`, { token: fx.founder.token });
  assert.equal(status, 200);
});

// --- Pagination / filtering / search ---

test("list supports pagination via flat limit/skip query params", async () => {
  const fx = await createCollaborationFixture();
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await api("/api/v1/projects", { method: "POST", token: fx.founder.token, body: payload(fx.workspace._id, { name: `Page Project ${i}` }) });
  }
  const { json } = await api("/api/v1/projects?limit=2&skip=0", { token: fx.founder.token });
  assert.equal(json.data.length, 2);
});

test("list supports filtering by status", async () => {
  const fx = await createCollaborationFixture();
  await api("/api/v1/projects", { method: "POST", token: fx.founder.token, body: payload(fx.workspace._id, { name: "Active One", status: "active" }) });
  await api("/api/v1/projects", { method: "POST", token: fx.founder.token, body: payload(fx.workspace._id, { name: "Planning One", status: "planning" }) });

  const { json } = await api("/api/v1/projects?status=active", { token: fx.founder.token });
  assert.ok(json.data.every((p) => p.status === "active"));
  assert.ok(json.data.some((p) => p.name === "Active One"));
});

test("list supports search by name", async () => {
  const fx = await createCollaborationFixture();
  await api("/api/v1/projects", { method: "POST", token: fx.founder.token, body: payload(fx.workspace._id, { name: "Searchable Rocket Project" }) });
  await api("/api/v1/projects", { method: "POST", token: fx.founder.token, body: payload(fx.workspace._id, { name: "Something Else" }) });

  const { json } = await api("/api/v1/projects?search=Rocket", { token: fx.founder.token });
  assert.equal(json.data.length, 1);
  assert.equal(json.data[0].name, "Searchable Rocket Project");
});

// --- Relationship-chain integrity (regression) ---

test("a Task's project reference stays valid across archive and restore (no orphaning)", async () => {
  const fx = await createCollaborationFixture();
  const task = await Task.create({ project: fx.project._id, title: "Fixture Task", createdBy: fx.founder.user._id });

  await api(`/api/v1/projects/${fx.project._id}`, { method: "DELETE", token: fx.founder.token });
  const afterArchive = await Task.findById(task._id).populate("project").lean();
  assert.ok(afterArchive.project);
  assert.equal(String(afterArchive.project._id), String(fx.project._id));

  await api(`/api/v1/projects/${fx.project._id}/restore`, { method: "POST", token: fx.founder.token });
  const afterRestore = await Task.findById(task._id).populate("project").lean();
  assert.ok(afterRestore.project);
  assert.equal(afterRestore.project.isArchived, false);
});
