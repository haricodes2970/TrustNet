// Task module integration tests. Runs the real Express app over HTTP
// against an in-memory MongoDB instance. Complements the existing thorough
// service-level test/integration/taskAuthorization.test.js (full owner/
// admin/contributor/unrelated permission matrix) - this file exercises
// routes/controller/validators plus everything added in this phase:
// archive/restore + status-sync lifecycle, platform-admin override,
// milestone-linkage hardening, and edge cases (removed/suspended assignee,
// cross-project isolation, pagination/search).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const Project = require("../../src/models/Project");
const Milestone = require("../../src/models/Milestone");
const Team = require("../../src/models/Team");
const User = require("../../src/models/User");

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
  return { projectId: String(projectId), title: `Task ${Date.now()}${Math.floor(Math.random() * 1e6)}`, ...overrides };
}

// --- Create + validation ---

test("create rejects unauthenticated", async () => {
  const { status } = await api("/api/v1/tasks", { method: "POST", body: { projectId: "x", title: "T" } });
  assert.equal(status, 401);
});

test("create rejects a title shorter than 2 chars (validation)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "A" }) });
  assert.equal(status, 400);
});

test("create returns 404 for a nonexistent project", async () => {
  const fx = await createCollaborationFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const { status } = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fakeId) });
  assert.equal(status, 404);
});

test("create is rejected against an archived project with 409", async () => {
  const fx = await createCollaborationFixture();
  await Project.findByIdAndUpdate(fx.project._id, { isArchived: true });
  const { status } = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  assert.equal(status, 409);
});

test("contributor assigning a task to someone else is rejected with 403 (status-code regression)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api("/api/v1/tasks", {
    method: "POST",
    token: fx.contributorMember.token,
    body: payload(fx.project._id, { assignedTo: String(fx.adminMember.user._id) }),
  });
  assert.equal(status, 403);
});

test("assigning a task to a pending (not-active) member is rejected with 400", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api("/api/v1/tasks", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.project._id, { assignedTo: String(fx.pendingMember.user._id) }),
  });
  assert.equal(status, 400);
});

test("unrelated user cannot create a task (403)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api("/api/v1/tasks", { method: "POST", token: fx.unrelatedUser.token, body: payload(fx.project._id) });
  assert.equal(status, 403);
});

// --- Platform admin override ---

test("a platform admin can create/update/archive/restore a task in a workspace they have no role in", async () => {
  const fx = await createCollaborationFixture();
  const admin = await makeAdmin();

  const created = await api("/api/v1/tasks", { method: "POST", token: admin.token, body: payload(fx.project._id, { title: "Admin Task" }) });
  assert.equal(created.status, 201);
  const id = created.json.data._id;

  const updated = await api(`/api/v1/tasks/${id}`, { method: "PUT", token: admin.token, body: { description: "edited" } });
  assert.equal(updated.status, 200);

  const archived = await api(`/api/v1/tasks/${id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);

  const restored = await api(`/api/v1/tasks/${id}/restore`, { method: "POST", token: admin.token });
  assert.equal(restored.status, 200);
});

// --- Get ---

test("get returns 404 for nonexistent, 403 for unrelated user", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const fakeId = new mongoose.Types.ObjectId();

  const notFound = await api(`/api/v1/tasks/${fakeId}`, { token: fx.founder.token });
  assert.equal(notFound.status, 404);

  const unauthorized = await api(`/api/v1/tasks/${created.json.data._id}`, { token: fx.unrelatedUser.token });
  assert.equal(unauthorized.status, 403);
});

// --- Archive/restore lifecycle + status<->isArchived sync ---

test("archive hides a task from the default list; restore brings it back and re-allows edits", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const id = created.json.data._id;

  const archived = await api(`/api/v1/tasks/${id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);
  assert.equal(archived.json.data.status, "archived");

  const list = await api("/api/v1/tasks", { token: fx.founder.token });
  assert.ok(!list.json.data.some((t) => t._id === id));

  const blockedUpdate = await api(`/api/v1/tasks/${id}`, { method: "PUT", token: fx.founder.token, body: { title: "should fail" } });
  assert.equal(blockedUpdate.status, 409);

  const restored = await api(`/api/v1/tasks/${id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);
  assert.equal(restored.json.data.status, "todo");

  const editAfterRestore = await api(`/api/v1/tasks/${id}`, { method: "PUT", token: fx.founder.token, body: { title: "edited after restore" } });
  assert.equal(editAfterRestore.status, 200);
});

test("setting status to 'archived' via PUT syncs isArchived (regression: previously could drift out of sync)", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });

  const updated = await api(`/api/v1/tasks/${created.json.data._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { status: "archived" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.isArchived, true);

  const list = await api("/api/v1/tasks", { token: fx.founder.token });
  assert.ok(!list.json.data.some((t) => t._id === created.json.data._id));
});

test("restoring a task is blocked while its parent project is still archived", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  await api(`/api/v1/tasks/${created.json.data._id}`, { method: "DELETE", token: fx.founder.token });
  await Project.findByIdAndUpdate(fx.project._id, { isArchived: true });

  const { status } = await api(`/api/v1/tasks/${created.json.data._id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(status, 409);
});

// --- Status/priority transitions, due dates ---

test("valid status and priority transitions are accepted", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const id = created.json.data._id;

  const toInProgress = await api(`/api/v1/tasks/${id}`, { method: "PUT", token: fx.founder.token, body: { status: "in_progress" } });
  assert.equal(toInProgress.status, 200);

  const toDone = await api(`/api/v1/tasks/${id}`, { method: "PUT", token: fx.founder.token, body: { status: "done", priority: "urgent" } });
  assert.equal(toDone.status, 200);
  assert.equal(toDone.json.data.status, "done");
  assert.equal(toDone.json.data.priority, "urgent");
});

test("an invalid status value is rejected by validation", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });
  const { status } = await api(`/api/v1/tasks/${created.json.data._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { status: "not-a-real-status" },
  });
  assert.equal(status, 400);
});

test("a past due date is accepted, not rejected (edge case)", async () => {
  const fx = await createCollaborationFixture();
  const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { status, json } = await api("/api/v1/tasks", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.project._id, { dueDate: past }),
  });
  assert.equal(status, 201);
  assert.ok(json.data.dueDate);
});

// --- Assignment edge cases ---

test("reassigning a task to the same assignee twice is idempotent, not an error", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.project._id, { assignedTo: String(fx.contributorMember.user._id) }),
  });
  const id = created.json.data._id;

  const first = await api(`/api/v1/tasks/${id}`, { method: "PUT", token: fx.founder.token, body: { assignedTo: String(fx.contributorMember.user._id) } });
  assert.equal(first.status, 200);
  const second = await api(`/api/v1/tasks/${id}`, { method: "PUT", token: fx.founder.token, body: { assignedTo: String(fx.contributorMember.user._id) } });
  assert.equal(second.status, 200);
});

test("a member removed from the team loses access to tasks they were assigned (edge case)", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.project._id, { assignedTo: String(fx.contributorMember.user._id) }),
  });
  const id = created.json.data._id;

  const stillHasAccess = await api(`/api/v1/tasks/${id}`, { token: fx.contributorMember.token });
  assert.equal(stillHasAccess.status, 200);

  const team = await Team.findById(fx.team._id).lean();
  const memberRecord = team.members.find((m) => String(m.user) === String(fx.contributorMember.user._id));
  await api(`/api/v1/teams/${fx.team._id}/members/${memberRecord._id}`, { method: "DELETE", token: fx.founder.token });

  const afterRemoval = await api(`/api/v1/tasks/${id}`, { token: fx.contributorMember.token });
  assert.equal(afterRemoval.status, 403);
});

test("a suspended assignee is blocked at the auth layer before any task-permission check runs", async () => {
  const fx = await createCollaborationFixture();
  const created = await api("/api/v1/tasks", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.project._id, { assignedTo: String(fx.contributorMember.user._id) }),
  });
  await User.findByIdAndUpdate(fx.contributorMember.user._id, { isActive: false });

  const { status } = await api(`/api/v1/tasks/${created.json.data._id}`, { token: fx.contributorMember.token });
  assert.equal(status, 403);
});

// --- Milestone linkage (relationship integrity) ---

test("linking a task to a milestone from a different project is rejected", async () => {
  const fxA = await createCollaborationFixture();
  const fxB = await createCollaborationFixture();
  const milestoneB = await Milestone.create({ project: fxB.project._id, title: "Other Project Milestone", createdBy: fxB.founder.user._id });

  const created = await api("/api/v1/tasks", { method: "POST", token: fxA.founder.token, body: payload(fxA.project._id) });
  const { status } = await api(`/api/v1/tasks/${created.json.data._id}`, {
    method: "PUT",
    token: fxA.founder.token,
    body: { milestone: String(milestoneB._id) },
  });
  assert.equal(status, 400);
});

test("linking a task to an archived milestone is rejected (409)", async () => {
  const fx = await createCollaborationFixture();
  const milestone = await Milestone.create({ project: fx.project._id, title: "Archived Milestone", createdBy: fx.founder.user._id, isArchived: true });
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });

  const { status } = await api(`/api/v1/tasks/${created.json.data._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { milestone: String(milestone._id) },
  });
  assert.equal(status, 409);
});

test("linking a task to a valid, active milestone in the same project succeeds", async () => {
  const fx = await createCollaborationFixture();
  const milestone = await Milestone.create({ project: fx.project._id, title: "Real Milestone", createdBy: fx.founder.user._id });
  const created = await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id) });

  const { status, json } = await api(`/api/v1/tasks/${created.json.data._id}`, {
    method: "PUT",
    token: fx.founder.token,
    body: { milestone: String(milestone._id) },
  });
  assert.equal(status, 200);
  assert.equal(String(json.data.milestone), String(milestone._id));
});

// --- Cross-project / cross-workspace isolation ---

test("a member of workspace A cannot view, update, or filter into workspace B's tasks", async () => {
  const fxA = await createCollaborationFixture();
  const fxB = await createCollaborationFixture();
  const taskB = await api("/api/v1/tasks", { method: "POST", token: fxB.founder.token, body: payload(fxB.project._id) });

  const view = await api(`/api/v1/tasks/${taskB.json.data._id}`, { token: fxA.founder.token });
  assert.equal(view.status, 403);

  const update = await api(`/api/v1/tasks/${taskB.json.data._id}`, { method: "PUT", token: fxA.founder.token, body: { title: "cross-tenant" } });
  assert.equal(update.status, 403);

  const listFiltered = await api(`/api/v1/tasks?projectId=${fxB.project._id}`, { token: fxA.founder.token });
  assert.equal(listFiltered.status, 403);
});

// --- Pagination / filtering / search ---

test("list supports pagination via flat limit/skip", async () => {
  const fx = await createCollaborationFixture();
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: `Page Task ${i}` }) });
  }
  const { json } = await api("/api/v1/tasks?limit=2&skip=0", { token: fx.founder.token });
  assert.equal(json.data.length, 2);
});

test("list supports filtering by status and priority", async () => {
  const fx = await createCollaborationFixture();
  await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "Urgent One", priority: "urgent" }) });
  await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "Low One", priority: "low" }) });

  const { json } = await api("/api/v1/tasks?priority=urgent", { token: fx.founder.token });
  assert.ok(json.data.every((t) => t.priority === "urgent"));
  assert.ok(json.data.some((t) => t.title === "Urgent One"));
});

test("list supports search by title, and assignedTo=me", async () => {
  const fx = await createCollaborationFixture();
  await api("/api/v1/tasks", { method: "POST", token: fx.founder.token, body: payload(fx.project._id, { title: "Findable Rocket Task" }) });
  await api("/api/v1/tasks", {
    method: "POST",
    token: fx.founder.token,
    body: payload(fx.project._id, { title: "Mine", assignedTo: String(fx.contributorMember.user._id) }),
  });

  const search = await api("/api/v1/tasks?search=Rocket", { token: fx.founder.token });
  assert.equal(search.json.data.length, 1);

  const mine = await api("/api/v1/tasks?assignedTo=me", { token: fx.contributorMember.token });
  assert.ok(mine.json.data.every((t) => t.assignedTo === String(fx.contributorMember.user._id)));
  assert.ok(mine.json.data.some((t) => t.title === "Mine"));
});
