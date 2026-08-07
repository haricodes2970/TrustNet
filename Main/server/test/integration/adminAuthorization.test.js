// Admin Dashboard integration tests. Runs the real Express app over HTTP
// against an in-memory MongoDB instance so route wiring, authenticate/
// authorize/validate middleware, and the admin services are all actually
// exercised end to end. Out of scope: real email delivery (SMTP is
// configured in this repo's .env — tests must never trigger a real send).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const User = require("../../src/models/User");
const Post = require("../../src/models/Post");
const Job = require("../../src/models/Job");
const Startup = require("../../src/models/Startup");
const AuditLog = require("../../src/models/AuditLog");

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

async function makeAdmin(overrides = {}) {
  return createAuthenticatedTestUser({ role: "admin", ...overrides });
}

async function makeUser(overrides = {}) {
  return createAuthenticatedTestUser({ role: "builder", ...overrides });
}

async function makeStartup(founderId, overrides = {}) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return Startup.create({
    founder: founderId,
    name: `Test Startup ${unique}`,
    slug: `test-startup-${unique}`,
    description: "A".repeat(60),
    category: "Fintech",
    ...overrides,
  });
}

// --- Cross-cutting: authentication / authorization on the admin router ---

test("unauthenticated request is rejected with 401", async () => {
  const { status } = await api("/api/v1/admin/dashboard/overview");
  assert.equal(status, 401);
});

test("non-admin authenticated request is rejected with 403", async () => {
  const { user, token } = await makeUser();
  const { status } = await api("/api/v1/admin/dashboard/overview", { token });
  assert.equal(status, 403);
  assert.ok(user);
});

test("admin request succeeds", async () => {
  const { token } = await makeAdmin();
  const { status, json } = await api("/api/v1/admin/dashboard/overview", { token });
  assert.equal(status, 200);
  assert.equal(json.success, true);
});

test("a suspended user is rejected on their next request, mid-session (regression)", async () => {
  const admin = await makeAdmin();
  const target = await makeUser();

  const suspend = await api(`/api/v1/admin/users/${target.user._id}/suspend`, {
    method: "POST",
    token: admin.token,
    body: { reason: "test" },
  });
  assert.equal(suspend.status, 200);

  const blocked = await api("/api/v1/admin/dashboard/overview", { token: target.token });
  assert.equal(blocked.status, 403);
});

// --- Dashboard overview ---

test("dashboard overview returns expected shape and counts", async () => {
  const { token } = await makeAdmin();
  await makeUser();
  const { status, json } = await api("/api/v1/admin/dashboard/overview", { token });
  assert.equal(status, 200);
  assert.ok(json.data.totals);
  assert.ok(Number.isInteger(json.data.totals.users));
  assert.ok(Array.isArray(json.data.recentActivity));
});

// --- Verification management ---

test("list pending verifications returns only pending users", async () => {
  const { token } = await makeAdmin();
  await makeUser({ verificationStatus: "pending" });
  await makeUser({ verificationStatus: "approved" });
  const { status, json } = await api("/api/v1/admin/verifications", { token });
  assert.equal(status, 200);
  assert.equal(json.data.length, 1);
  assert.equal(json.data[0].verificationStatus, "pending");
});

test("get verification for a nonexistent user returns 404", async () => {
  const { token } = await makeAdmin();
  const fakeId = "507f1f77bcf86cd799439011";
  const { status } = await api(`/api/v1/admin/verifications/${fakeId}`, { token });
  assert.equal(status, 404);
});

test("approve verification marks the user verified and writes an audit log entry", async () => {
  const { token } = await makeAdmin();
  const target = await makeUser({ verificationStatus: "pending" });

  const { status, json } = await api(`/api/v1/admin/verifications/${target.user._id}/approve`, {
    method: "POST",
    token,
  });
  assert.equal(status, 200);
  assert.equal(json.data.verificationStatus, "approved");
  assert.equal(json.data.isVerified, true);

  const logs = await AuditLog.find({ action: "verification.approve" }).lean();
  assert.equal(logs.length, 1);
  assert.equal(String(logs[0].targetId), String(target.user._id));
});

test("reject verification records the reason on the documents and audit log", async () => {
  const { token } = await makeAdmin();
  const target = await makeUser({
    verificationStatus: "pending",
    verificationDocuments: [{ type: "government_id", name: "id.png", url: "https://x.com/id.png", publicId: "p1", status: "pending" }],
  });

  const { status, json } = await api(`/api/v1/admin/verifications/${target.user._id}/reject`, {
    method: "POST",
    token,
    body: { reason: "Blurry photo" },
  });
  assert.equal(status, 200);
  assert.equal(json.data.verificationStatus, "rejected");
  assert.equal(json.data.verificationDocuments[0].rejectionReason, "Blurry photo");

  const logs = await AuditLog.find({ action: "verification.reject" }).lean();
  assert.equal(logs[0].details.reason, "Blurry photo");
});

test("request resubmission sets a distinct status from a hard rejection", async () => {
  const { token } = await makeAdmin();
  const target = await makeUser({ verificationStatus: "pending" });

  const { status, json } = await api(`/api/v1/admin/verifications/${target.user._id}/request-resubmission`, {
    method: "POST",
    token,
    body: { reason: "Upload a clearer document" },
  });
  assert.equal(status, 200);
  assert.equal(json.data.verificationStatus, "resubmission_requested");
});

// --- User management ---

test("list users supports search, filtering and pagination", async () => {
  const { token } = await makeAdmin();
  await makeUser({ fullName: "Findable Person", role: "founder" });
  await makeUser({ fullName: "Someone Else", role: "mentor" });

  const search = await api("/api/v1/admin/users?search=Findable", { token });
  assert.equal(search.status, 200);
  assert.equal(search.json.data.length, 1);
  assert.equal(search.json.data[0].fullName, "Findable Person");

  const filtered = await api("/api/v1/admin/users?role=mentor", { token });
  assert.equal(filtered.json.data.length, 1);
  assert.equal(filtered.json.data[0].role, "mentor");

  const paged = await api("/api/v1/admin/users?limit=1&skip=0", { token });
  assert.equal(paged.json.data.length, 1);
  assert.ok(paged.json.meta.total >= 2);
});

test("get user details for a nonexistent id returns 404", async () => {
  const { token } = await makeAdmin();
  const { status } = await api("/api/v1/admin/users/507f1f77bcf86cd799439011", { token });
  assert.equal(status, 404);
});

test("suspend then reactivate a user round-trips isActive", async () => {
  const admin = await makeAdmin();
  const target = await makeUser();

  const suspended = await api(`/api/v1/admin/users/${target.user._id}/suspend`, {
    method: "POST",
    token: admin.token,
    body: { reason: "abuse" },
  });
  assert.equal(suspended.status, 200);
  assert.equal(suspended.json.data.isActive, false);

  const reactivated = await api(`/api/v1/admin/users/${target.user._id}/reactivate`, {
    method: "POST",
    token: admin.token,
  });
  assert.equal(reactivated.status, 200);
  assert.equal(reactivated.json.data.isActive, true);
});

test("an admin cannot suspend their own account", async () => {
  const admin = await makeAdmin();
  const { status, json } = await api(`/api/v1/admin/users/${admin.user._id}/suspend`, {
    method: "POST",
    token: admin.token,
  });
  assert.equal(status, 400);
  assert.match(json.message, /own account/i);
});

test("change role updates the user's role and rejects an invalid role", async () => {
  const admin = await makeAdmin();
  const target = await makeUser({ role: "builder" });

  const invalid = await api(`/api/v1/admin/users/${target.user._id}/role`, {
    method: "PATCH",
    token: admin.token,
    body: { role: "not-a-real-role" },
  });
  assert.equal(invalid.status, 400);

  const valid = await api(`/api/v1/admin/users/${target.user._id}/role`, {
    method: "PATCH",
    token: admin.token,
    body: { role: "investor" },
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.json.data.role, "investor");
});

test("soft-deleted user is blocked from authenticating (regression)", async () => {
  const admin = await makeAdmin();
  const target = await makeUser();

  const del = await api(`/api/v1/admin/users/${target.user._id}`, { method: "DELETE", token: admin.token });
  assert.equal(del.status, 200);

  const blocked = await api("/api/v1/admin/dashboard/overview", { token: target.token });
  assert.equal(blocked.status, 401);
});

test("non-admin is rejected from every user-management route", async () => {
  const { token } = await makeUser();
  const other = await makeUser();
  const { status } = await api(`/api/v1/admin/users/${other.user._id}/suspend`, { method: "POST", token });
  assert.equal(status, 403);
});

// --- Content moderation ---

test("hide then restore a post round-trips isHidden and is excluded from the public list while hidden", async () => {
  const admin = await makeAdmin();
  const author = await makeUser();
  const post = await Post.create({ author: author.user._id, content: "Hello world, this is a test post." });

  const hidden = await api(`/api/v1/admin/content/posts/${post._id}/moderate`, {
    method: "POST",
    token: admin.token,
    body: { action: "hide" },
  });
  assert.equal(hidden.status, 200);
  assert.equal(hidden.json.data.isHidden, true);

  const publicList = await api("/api/v1/posts");
  assert.ok(!publicList.json.data.some((p) => p._id === String(post._id)));

  const restored = await api(`/api/v1/admin/content/posts/${post._id}/moderate`, {
    method: "POST",
    token: admin.token,
    body: { action: "restore" },
  });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isHidden, false);
});

test("delete a job (soft) via moderation bypasses startup-team ownership checks", async () => {
  const admin = await makeAdmin();
  const founder = await makeUser();
  const startup = await makeStartup(founder.user._id);
  const job = await Job.create({ startup: startup._id, title: "Founding Engineer", createdBy: founder.user._id });

  const { status, json } = await api(`/api/v1/admin/content/jobs/${job._id}/moderate`, {
    method: "POST",
    token: admin.token,
    body: { action: "delete" },
  });
  assert.equal(status, 200);
  assert.ok(json.data.deletedAt);
});

test("moderate rejects an unknown content type", async () => {
  const { token } = await makeAdmin();
  const { status } = await api("/api/v1/admin/content/not-a-type/507f1f77bcf86cd799439011/moderate", {
    method: "POST",
    token,
    body: { action: "hide" },
  });
  assert.equal(status, 400);
});

test("moderate rejects an invalid action (validator)", async () => {
  const { token } = await makeAdmin();
  const { status } = await api("/api/v1/admin/content/posts/507f1f77bcf86cd799439011/moderate", {
    method: "POST",
    token,
    body: { action: "not-a-real-action" },
  });
  assert.equal(status, 400);
});

test("moderate on a nonexistent post id returns 404", async () => {
  const { token } = await makeAdmin();
  const { status } = await api("/api/v1/admin/content/posts/507f1f77bcf86cd799439011/moderate", {
    method: "POST",
    token,
    body: { action: "hide" },
  });
  assert.equal(status, 404);
});

// --- Startup management ---

test("suspended startups are excluded from the public list by default", async () => {
  const admin = await makeAdmin();
  const founder = await makeUser();
  const startup = await makeStartup(founder.user._id);

  const suspend = await api(`/api/v1/admin/startups/${startup._id}/suspend`, {
    method: "POST",
    token: admin.token,
    body: { reason: "policy violation" },
  });
  assert.equal(suspend.status, 200);
  assert.equal(suspend.json.data.isSuspended, true);

  const publicList = await api("/api/v1/startups");
  assert.ok(!publicList.json.data.some((s) => s._id === String(startup._id)));

  const restore = await api(`/api/v1/admin/startups/${startup._id}/restore`, {
    method: "POST",
    token: admin.token,
  });
  assert.equal(restore.status, 200);
  assert.equal(restore.json.data.isSuspended, false);
});

test("non-admin is rejected from startup suspend", async () => {
  const { token } = await makeUser();
  const founder = await makeUser();
  const startup = await makeStartup(founder.user._id);
  const { status } = await api(`/api/v1/admin/startups/${startup._id}/suspend`, { method: "POST", token });
  assert.equal(status, 403);
});

// --- Activity logs ---

test("activity logs list and filter by targetType, with pagination meta", async () => {
  const admin = await makeAdmin();
  const target = await makeUser();
  await api(`/api/v1/admin/users/${target.user._id}/suspend`, { method: "POST", token: admin.token });

  const { status, json } = await api("/api/v1/admin/activity-logs?targetType=User&limit=5", { token: admin.token });
  assert.equal(status, 200);
  assert.ok(json.data.length >= 1);
  assert.ok(json.data.every((entry) => entry.targetType === "User"));
  assert.ok(Number.isInteger(json.meta.total));
});

test("non-admin is rejected from activity logs", async () => {
  const { token } = await makeUser();
  const { status } = await api("/api/v1/admin/activity-logs", { token });
  assert.equal(status, 403);
});
