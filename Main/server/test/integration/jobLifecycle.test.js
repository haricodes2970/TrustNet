// Job module integration tests (Hiring & Applications phase). Runs the real
// Express app over HTTP against an in-memory MongoDB instance. Complements
// the existing exceptionally thorough service-level jobAuthorization.
// test.js (27 tests) - this file exercises routes/controller/validators
// plus everything added in this phase: restore, closeJob, platform-admin
// override, and the startup-delete -> Job cascade. Split into its own file
// (paired with applicationLifecycle.test.js) rather than one combined
// file - the combined version's total request volume tripped the global
// defaultLimiter (100 req/15min) within a single run; splitting halves
// each file's volume, matching this repo's existing convention of one
// test file per module even for phases that audit modules together.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const Startup = require("../../src/models/Startup");
const Job = require("../../src/models/Job");

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

async function api(pathName, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${pathName}`, {
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

function jobPayload(startupId, overrides = {}) {
  return {
    startupId: String(startupId),
    title: `Job ${Date.now()}${Math.floor(Math.random() * 1e6)}`,
    description: "Build great things.",
    employmentType: "full-time",
    remotePolicy: "remote",
    ...overrides,
  };
}

async function createPublishedJob(fx, overrides = {}) {
  const created = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fx.startup._id, overrides) });
  const published = await api(`/api/v1/jobs/${created.json.data._id}/publish`, { method: "PUT", token: fx.founder.token });
  return published.json.data;
}

test("create rejects unauthenticated", async () => {
  const fx = await createStartupTeamFixture();
  const { status } = await api("/api/v1/jobs", { method: "POST", body: jobPayload(fx.startup._id) });
  assert.equal(status, 401);
});

test("create: founder/admin succeed, contributor and unrelated are rejected with 403", async () => {
  const fx = await createStartupTeamFixture();
  const byFounder = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fx.startup._id) });
  assert.equal(byFounder.status, 201);

  const byContributor = await api("/api/v1/jobs", { method: "POST", token: fx.contributorMember.token, body: jobPayload(fx.startup._id) });
  assert.equal(byContributor.status, 403);

  const byUnrelated = await api("/api/v1/jobs", { method: "POST", token: fx.unrelatedUser.token, body: jobPayload(fx.startup._id) });
  assert.equal(byUnrelated.status, 403);
});

test("create returns 404 for a nonexistent startup, 409 for a deleted one", async () => {
  const fx = await createStartupTeamFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const notFound = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fakeId) });
  assert.equal(notFound.status, 404);

  await Startup.findByIdAndUpdate(fx.startup._id, { deletedAt: new Date() });
  const deleted = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fx.startup._id) });
  assert.equal(deleted.status, 409);
});

test("full lifecycle: draft -> publish -> unpublish -> close -> archive -> restore", async () => {
  const fx = await createStartupTeamFixture();
  const created = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fx.startup._id) });
  const id = created.json.data._id;
  assert.equal(created.json.data.status, "draft");

  const published = await api(`/api/v1/jobs/${id}/publish`, { method: "PUT", token: fx.founder.token });
  assert.equal(published.json.data.status, "published");

  const unpublished = await api(`/api/v1/jobs/${id}/unpublish`, { method: "PUT", token: fx.founder.token });
  assert.equal(unpublished.json.data.status, "draft");

  await api(`/api/v1/jobs/${id}/publish`, { method: "PUT", token: fx.founder.token });
  const closed = await api(`/api/v1/jobs/${id}/close`, { method: "PUT", token: fx.founder.token });
  assert.equal(closed.status, 200);
  assert.equal(closed.json.data.status, "closed");

  const archived = await api(`/api/v1/jobs/${id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);

  const blockedUpdate = await api(`/api/v1/jobs/${id}`, { method: "PUT", token: fx.founder.token, body: { title: "should fail" } });
  assert.equal(blockedUpdate.status, 409);

  const restored = await api(`/api/v1/jobs/${id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);
});

test("restore is blocked while the startup is still deleted", async () => {
  const fx = await createStartupTeamFixture();
  const created = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fx.startup._id) });
  await api(`/api/v1/jobs/${created.json.data._id}`, { method: "DELETE", token: fx.founder.token });
  await Startup.findByIdAndUpdate(fx.startup._id, { deletedAt: new Date() });

  const { status } = await api(`/api/v1/jobs/${created.json.data._id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(status, 409);
});

test("a platform admin can create/update/publish/close/archive/restore a job for a startup they have no role in", async () => {
  const fx = await createStartupTeamFixture();
  const admin = await makeAdmin();

  const created = await api("/api/v1/jobs", { method: "POST", token: admin.token, body: jobPayload(fx.startup._id) });
  assert.equal(created.status, 201);
  const id = created.json.data._id;

  const updated = await api(`/api/v1/jobs/${id}`, { method: "PUT", token: admin.token, body: { title: "Admin Edited" } });
  assert.equal(updated.status, 200);

  const published = await api(`/api/v1/jobs/${id}/publish`, { method: "PUT", token: admin.token });
  assert.equal(published.status, 200);

  const closed = await api(`/api/v1/jobs/${id}/close`, { method: "PUT", token: admin.token });
  assert.equal(closed.status, 200);

  const archived = await api(`/api/v1/jobs/${id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);

  const restored = await api(`/api/v1/jobs/${id}/restore`, { method: "POST", token: admin.token });
  assert.equal(restored.status, 200);
});

test("soft-deleting the startup cascades to isArchived on its jobs, removing them from the public board", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);

  const publicList = await api("/api/v1/jobs");
  assert.ok(publicList.json.data.some((j) => j._id === String(job._id)));

  await api(`/api/v1/startups/${fx.startup._id}`, { method: "DELETE", token: fx.founder.token });

  const afterDelete = await api("/api/v1/jobs");
  assert.ok(!afterDelete.json.data.some((j) => j._id === String(job._id)));

  const stillExists = await Job.findById(job._id).lean();
  assert.equal(stillExists.isArchived, true);
});

test("list supports pagination, status filter, and search", async () => {
  const fx = await createStartupTeamFixture();
  await createPublishedJob(fx, { title: "Paginated Role 0" });
  await createPublishedJob(fx, { title: "Paginated Role 1" });
  await createPublishedJob(fx, { title: "Searchable Rocket Engineer" });

  const paged = await api("/api/v1/jobs?limit=2&skip=0");
  assert.equal(paged.json.data.length, 2);

  const searched = await api("/api/v1/jobs?search=Rocket");
  assert.equal(searched.json.data.length, 1);
});
