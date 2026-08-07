// Milestone module integration tests. Runs the real Express app over HTTP
// against an in-memory MongoDB instance. Complements the existing
// service-level test/integration/milestoneIntegrity.test.js (cross-project
// task<->milestone reference guard) - this file exercises routes/
// controller/validators plus everything added in this phase: archive/
// restore + status-sync lifecycle, platform-admin override, duplicate-name
// prevention, parent-project-archived propagation, and task-linkage edge
// cases (archived milestone, milestone with active/completed tasks).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const Project = require("../../src/models/Project");
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

function payload(projectId, overrides = {}) {
  return { projectId: String(projectId), title: `Milestone ${Date.now()}${Math.floor(Math.random() * 1e6)}`, ...overrides };
}

// --- Create + validation ---

test("create rejects unauthenticated", async () => {
  const { status } = await api("/api/v1/milestones", { method: "POST", body: { projectId: "x", title: "M" } });
  assert.equal(status, 401);
});

test("create rejects a title shorter than 2 chars (validation)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "A" }) });
  assert.equal(status, 400);
});

test("create returns 404 for a nonexistent project", async () => {
  const fx = await createCollaborationFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const { status } = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fakeId) });
  assert.equal(status, 404);
});

test("create is rejected against an archived project with 409", async () => {
  const fx = await createCollaborationFixture();
  await Project.findByIdAndUpdate(fx.project._id, { isArchived: true });
  const { status } = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  assert.equal(status, 409);
});

test("create rejects a duplicate title within the same project (409), allows reuse after archive", async () => {
  const fx = await createCollaborationFixture();
  const first = payload(fx.project._id, { title: "Beta Launch" });
  const created = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: first });
  assert.equal(created.status, 201);

  const dup = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "beta launch" }) });
  assert.equal(dup.status, 409);

  await api(`/api/v1/milestones/${created.json.data._id}`, { method: "DELETE", token: fx.founder.token });
  const afterArchive = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "Beta Launch" }) });
  assert.equal(afterArchive.status, 201);
});

// --- Permission matrix ---

test("permission matrix: founder and workspace-admin can create, contributor cannot (read-only), unrelated cannot", async () => {
  const fx = await createCollaborationFixture();

  const byFounder = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "By Founder" }) });
  assert.equal(byFounder.status, 201);

  const byAdmin = await api("/api/v1/milestones", { method: "POST", token: fx.adminMember.token, body: payload(fx.project._id, { title: "By Admin" }) });
  assert.equal(byAdmin.status, 201);

  const byContributor = await api("/api/v1/milestones", { method: "POST", token: fx.contributorMember.token, body: payload(fx.project._id, { title: "By Contributor" }) });
  assert.equal(byContributor.status, 403);

  const byUnrelated = await api("/api/v1/milestones", { method: "POST", token: fx.unrelatedUser.token, body: payload(fx.project._id, { title: "By Unrelated" }) });
  assert.equal(byUnrelated.status, 403);
});

test("a contributor can view a milestone but not update it (read-only)", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });

  const view = await api(`/api/v1/milestones/${created.json.data._id}`, { token: fx.contributorMember.token });
  assert.equal(view.status, 200);

  const update = await api(`/api/v1/milestones/${created.json.data._id}`, {
    method: "PUT",
    token: fx.contributorMember.token,
    body: { description: "should fail" },
  });
  assert.equal(update.status, 403);
});

test("a platform admin can create/update/archive/restore a milestone in a workspace they have no role in", async () => {
  const fx = await createCollaborationFixture();
  const admin = await makeAdmin();

  const created = await api("/api/v1/milestones", { method: "POST", token: admin.token, body: payload(fx.project._id, { title: "Admin Milestone" }) });
  assert.equal(created.status, 201);
  const id = created.json.data._id;

  const updated = await api(`/api/v1/milestones/${id}`, { method: "PUT", token: admin.token, body: { description: "edited" } });
  assert.equal(updated.status, 200);

  const archived = await api(`/api/v1/milestones/${id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);

  const restored = await api(`/api/v1/milestones/${id}/restore`, { method: "POST", token: admin.token });
  assert.equal(restored.status, 200);
});

test("get returns 404 for nonexistent, 403 for unrelated user", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const fakeId = new mongoose.Types.ObjectId();

  const notFound = await api(`/api/v1/milestones/${fakeId}`, { token: fx.founder.token });
  assert.equal(notFound.status, 404);

  const unauthorized = await api(`/api/v1/milestones/${created.json.data._id}`, { token: fx.unrelatedUser.token });
  assert.equal(unauthorized.status, 403);
});

// --- Archive/restore lifecycle + status sync + propagation ---

test("archive hides a milestone from the default list; restore brings it back and re-allows edits", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const id = created.json.data._id;

  const archived = await api(`/api/v1/milestones/${id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);
  assert.equal(archived.json.data.status, "archived");

  const list = await api("/api/v1/milestones", { token: fx.founder.token });
  assert.ok(!list.json.data.some((m) => m._id === id));

  const blockedUpdate = await api(`/api/v1/milestones/${id}`, { method: "PUT", token: fx.founder.token, body: { title: "should fail" } });
  assert.equal(blockedUpdate.status, 409);

  const restored = await api(`/api/v1/milestones/${id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);
  assert.equal(restored.json.data.status, "planned");

  const editAfterRestore = await api(`/api/v1/milestones/${id}`, { method: "PUT", token: fx.founder.token, body: { title: "edited after restore" } });
  assert.equal(editAfterRestore.status, 200);
});

test("setting status to 'archived' via PUT syncs isArchived (regression: same drift risk as Task)", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });

  const updated = await api(`/api/v1/milestones/${created.json.data._id}`, { method: "PUT", token: fx.founder.token, body: { status: "archived" } });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.isArchived, true);

  const list = await api("/api/v1/milestones", { token: fx.founder.token });
  assert.ok(!list.json.data.some((m) => m._id === created.json.data._id));
});

test("update is blocked while the parent project is archived (propagation)", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  await Project.findByIdAndUpdate(fx.project._id, { isArchived: true });

  const { status } = await api(`/api/v1/milestones/${created.json.data._id}`, { method: "PUT", token: fx.founder.token, body: { description: "should fail" } });
  assert.equal(status, 409);
});

test("restore is blocked while the parent project is still archived", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  await api(`/api/v1/milestones/${created.json.data._id}`, { method: "DELETE", token: fx.founder.token });
  await Project.findByIdAndUpdate(fx.project._id, { isArchived: true });

  const { status } = await api(`/api/v1/milestones/${created.json.data._id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(status, 409);
});

// --- Cross-project / cross-startup isolation ---

test("a member of workspace A cannot view, update, or filter into workspace B's milestones", async () => {
  const fxA = await createCollaborationFixture();
  const fxB = await createCollaborationFixture();
  const milestoneB = await api("/api/v1/milestones", { method: "POST", token: fxB.founder.token, body: payload(fxB.project._id) });

  const view = await api(`/api/v1/milestones/${milestoneB.json.data._id}`, { token: fxA.founder.token });
  assert.equal(view.status, 403);

  const update = await api(`/api/v1/milestones/${milestoneB.json.data._id}`, { method: "PUT", token: fxA.founder.token, body: { description: "cross-tenant" } });
  assert.equal(update.status, 403);

  const listFiltered = await api(`/api/v1/milestones?projectId=${fxB.project._id}`, { token: fxA.founder.token });
  assert.equal(listFiltered.status, 403);
});

// --- Task linkage edge cases ---

test("an archived milestone rejects new task links (409) - already enforced on the Task side, verified here from Milestone's perspective", async () => {
  const fx = await createCollaborationFixture();
  const milestone = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  await api(`/api/v1/milestones/${milestone.json.data._id}`, { method: "DELETE", token: fx.founder.token });

  const task = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: { projectId: fx.project._id, title: "Some Task" } });
  const { status } = await api(`/api/v1/tasks/${task.json.data._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { milestone: milestone.json.data._id },
  });
  assert.equal(status, 409);
});

test("a milestone with active (incomplete) tasks archives cleanly, leaving the task's reference intact", async () => {
  const fx = await createCollaborationFixture();
  const milestone = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const task = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: { projectId: fx.project._id, title: "In-progress Task" } });
  await api(`/api/v1/tasks/${task.json.data._id}`, { method: "PUT", token: fx.founder.token, body: { milestone: milestone.json.data._id, status: "in_progress" } });

  const archived = await api(`/api/v1/milestones/${milestone.json.data._id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);

  const stillLinked = await Task.findById(task.json.data._id).lean();
  assert.equal(String(stillLinked.milestone), String(milestone.json.data._id));
});

test("a milestone linked to a completed task archives cleanly", async () => {
  const fx = await createCollaborationFixture();
  const milestone = await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const task = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: { projectId: fx.project._id, title: "Done Task" } });
  await api(`/api/v1/tasks/${task.json.data._id}`, { method: "PUT", token: fx.founder.token, body: { milestone: milestone.json.data._id, status: "done" } });

  const archived = await api(`/api/v1/milestones/${milestone.json.data._id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);

  const stillLinked = await Task.findById(task.json.data._id).lean();
  assert.equal(stillLinked.status, "done");
  assert.equal(String(stillLinked.milestone), String(milestone.json.data._id));
});

// --- Pagination / filtering / search ---

test("list supports pagination via flat limit/skip", async () => {
  const fx = await createCollaborationFixture();
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: `Page Milestone ${i}` }) });
  }
  const { json } = await api("/api/v1/milestones?limit=2&skip=0", { token: fx.founder.token });
  assert.equal(json.data.length, 2);
});

test("list supports filtering by status and search by title", async () => {
  const fx = await createCollaborationFixture();
  await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "Searchable Rocket Milestone" }) });
  await api("/api/v1/milestones", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "Something Else" }) });

  const search = await api("/api/v1/milestones?search=Rocket", { token: fx.founder.token });
  assert.equal(search.json.data.length, 1);

  const byStatus = await api("/api/v1/milestones?status=planned", { token: fx.founder.token });
  assert.ok(byStatus.json.data.every((m) => m.status === "planned"));
});
