// Application module integration tests (Hiring & Applications phase). Runs
// the real Express app over HTTP with real multipart resume uploads against
// an in-memory MongoDB instance and the real local-disk storage provider.
// Complements the existing exceptionally thorough service-level
// applicationAuthorization.test.js (28 tests) - this file exercises
// routes/controller/validators/multer plus everything added in this phase:
// platform-admin override and the job-active-check fix (isHidden/
// deletedAt), including the startup-delete -> Job -> Application cascade.
// Paired with jobLifecycle.test.js (split from one combined file - the
// combined version's total request volume tripped the global
// defaultLimiter within a single run).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const User = require("../../src/models/User");

const STORAGE_ROOT = path.join(__dirname, "..", "..", "storage", "documents");

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
  await fs.rm(STORAGE_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
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

async function applyToJob(jobId, { token, coverLetter = "I would love to work here.", mimeType = "application/pdf", content = "%PDF-1.4 resume" } = {}) {
  const form = new FormData();
  form.append("jobId", String(jobId));
  if (coverLetter !== undefined) form.append("coverLetter", coverLetter);
  form.append("resume", new Blob([content], { type: mimeType }), "resume.pdf");
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api/v1/applications`, { method: "POST", headers, body: form });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function createPublishedJob(fx, overrides = {}) {
  const created = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fx.startup._id, overrides) });
  const published = await api(`/api/v1/jobs/${created.json.data._id}/publish`, { method: "PUT", token: fx.founder.token });
  return published.json.data;
}

test("create rejects unauthenticated, missing resume, and wrong mimetype", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);

  const anon = await applyToJob(job._id);
  assert.equal(anon.status, 401);

  const form = new FormData();
  form.append("jobId", String(job._id));
  const res = await fetch(`${baseUrl}/api/v1/applications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${fx.contributorMember.token}` },
    body: form,
  });
  assert.equal(res.status, 400);

  const wrongType = await applyToJob(job._id, { token: fx.contributorMember.token, mimeType: "image/png" });
  assert.equal(wrongType.status, 400);
});

test("cannot apply to a draft, archived, admin-hidden, or admin-deleted job", async () => {
  const fx = await createStartupTeamFixture();

  const draft = await api("/api/v1/jobs", { method: "POST", token: fx.founder.token, body: jobPayload(fx.startup._id) });
  const toDraft = await applyToJob(draft.json.data._id, { token: fx.contributorMember.token });
  assert.equal(toDraft.status, 409);

  const archivedJob = await createPublishedJob(fx);
  await api(`/api/v1/jobs/${archivedJob._id}`, { method: "DELETE", token: fx.founder.token });
  const toArchived = await applyToJob(archivedJob._id, { token: fx.contributorMember.token });
  assert.equal(toArchived.status, 409);

  const admin = await makeAdmin();

  const hiddenJob = await createPublishedJob(fx);
  await api(`/api/v1/admin/content/jobs/${hiddenJob._id}/moderate`, { method: "POST", token: admin.token, body: { action: "hide" } });
  const toHidden = await applyToJob(hiddenJob._id, { token: fx.contributorMember.token });
  assert.equal(toHidden.status, 409);

  const deletedJob = await createPublishedJob(fx);
  await api(`/api/v1/admin/content/jobs/${deletedJob._id}/moderate`, { method: "POST", token: admin.token, body: { action: "delete" } });
  const toDeleted = await applyToJob(deletedJob._id, { token: fx.contributorMember.token });
  assert.equal(toDeleted.status, 409);
});

test("duplicate active application is rejected (409), re-apply after withdrawal succeeds", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);

  const first = await applyToJob(job._id, { token: fx.contributorMember.token });
  assert.equal(first.status, 201);

  const dup = await applyToJob(job._id, { token: fx.contributorMember.token });
  assert.equal(dup.status, 409);

  await api(`/api/v1/applications/${first.json.data._id}/withdraw`, { method: "PUT", token: fx.contributorMember.token });
  const reapply = await applyToJob(job._id, { token: fx.contributorMember.token });
  assert.equal(reapply.status, 201);
});

test("get: candidate sees own with notes redacted, owner sees full with notes, unrelated is rejected, platform admin sees full", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);
  const applied = await applyToJob(job._id, { token: fx.contributorMember.token });
  const id = applied.json.data._id;

  await api(`/api/v1/applications/${id}/status`, { method: "PUT", token: fx.founder.token, body: { notes: "Strong candidate" } });

  const candidateView = await api(`/api/v1/applications/${id}`, { token: fx.contributorMember.token });
  assert.equal(candidateView.status, 200);
  assert.equal(candidateView.json.data.notes, undefined);

  const ownerView = await api(`/api/v1/applications/${id}`, { token: fx.founder.token });
  assert.equal(ownerView.status, 200);
  assert.equal(ownerView.json.data.notes, "Strong candidate");

  const unrelated = await api(`/api/v1/applications/${id}`, { token: fx.unrelatedUser.token });
  assert.equal(unrelated.status, 403);

  const admin = await makeAdmin();
  const adminView = await api(`/api/v1/applications/${id}`, { token: admin.token });
  assert.equal(adminView.status, 200);
  assert.equal(adminView.json.data.notes, "Strong candidate");
});

test("status transitions: valid forward path succeeds, skipping stages is rejected, terminal state is locked", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);
  const applied = await applyToJob(job._id, { token: fx.contributorMember.token });
  const id = applied.json.data._id;

  const skip = await api(`/api/v1/applications/${id}/status`, { method: "PUT", token: fx.founder.token, body: { status: "offer" } });
  assert.equal(skip.status, 400);

  const step1 = await api(`/api/v1/applications/${id}/status`, { method: "PUT", token: fx.founder.token, body: { status: "under_review" } });
  assert.equal(step1.status, 200);

  const rejected = await api(`/api/v1/applications/${id}/status`, { method: "PUT", token: fx.founder.token, body: { status: "rejected" } });
  assert.equal(rejected.status, 200);

  const afterTerminal = await api(`/api/v1/applications/${id}/status`, { method: "PUT", token: fx.founder.token, body: { status: "under_review" } });
  assert.equal(afterTerminal.status, 409);
});

test("a platform admin can update status and withdraw on behalf of a startup they have no role in", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);
  const applied = await applyToJob(job._id, { token: fx.contributorMember.token });
  const admin = await makeAdmin();

  const statusUpdate = await api(`/api/v1/applications/${applied.json.data._id}/status`, {
    method: "PUT",
    token: admin.token,
    body: { status: "under_review" },
  });
  assert.equal(statusUpdate.status, 200);

  const anotherApplied = await applyToJob(job._id, { token: fx.adminMember.token });
  const withdrawn = await api(`/api/v1/applications/${anotherApplied.json.data._id}/withdraw`, { method: "PUT", token: admin.token });
  assert.equal(withdrawn.status, 200);
  assert.equal(withdrawn.json.data.status, "withdrawn");
});

test("list: candidate sees only their own applications; owner and platform admin see the full roster with an explicit jobId filter", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);
  await applyToJob(job._id, { token: fx.contributorMember.token });
  await applyToJob(job._id, { token: fx.adminMember.token });

  const candidateList = await api("/api/v1/applications", { token: fx.contributorMember.token });
  assert.equal(candidateList.json.data.length, 1);

  const ownerRoster = await api(`/api/v1/applications?jobId=${job._id}`, { token: fx.founder.token });
  assert.equal(ownerRoster.json.data.length, 2);

  const admin = await makeAdmin();
  const adminRoster = await api(`/api/v1/applications?jobId=${job._id}`, { token: admin.token });
  assert.equal(adminRoster.json.data.length, 2);
});

test("list supports filtering by status", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);
  const a = await applyToJob(job._id, { token: fx.contributorMember.token });
  await api(`/api/v1/applications/${a.json.data._id}/status`, { method: "PUT", token: fx.founder.token, body: { status: "under_review" } });
  await applyToJob(job._id, { token: fx.adminMember.token });

  const { json } = await api(`/api/v1/applications?jobId=${job._id}&status=under_review`, { token: fx.founder.token });
  assert.equal(json.data.length, 1);
  assert.equal(json.data[0].status, "under_review");
});

test("edge case: a suspended applicant is blocked at the auth layer", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);
  await User.findByIdAndUpdate(fx.contributorMember.user._id, { isActive: false });

  const { status } = await applyToJob(job._id, { token: fx.contributorMember.token });
  assert.equal(status, 403);
});

test("cascade: once a startup is soft-deleted (job archived), applying to its jobs is rejected", async () => {
  const fx = await createStartupTeamFixture();
  const job = await createPublishedJob(fx);
  await api(`/api/v1/startups/${fx.startup._id}`, { method: "DELETE", token: fx.founder.token });

  const { status } = await applyToJob(job._id, { token: fx.contributorMember.token });
  assert.equal(status, 409);
});
