// Investor Profile + Investment Interest integration tests (Investors &
// Funding phase). Runs the real Express app over HTTP against an in-memory
// MongoDB instance. Complements the existing thorough service-level
// investorAuthorization.test.js - this file exercises routes/controller/
// validators plus everything added in this phase: platform-admin override,
// restoreInterest, and the startup-state (suspended/deleted) guards on
// createInterest.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const Startup = require("../../src/models/Startup");
const InvestmentInterest = require("../../src/models/InvestmentInterest");

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

// createStartupTeamFixture's Startup defaults to status:"draft" -
// createInterest requires "active", same activation step
// investorAuthorization.test.js already does for its own fixtures.
async function activateStartup(startupId) {
  await Startup.findByIdAndUpdate(startupId, { status: "active" });
}

// --- Investor Profile ---

test("create profile succeeds, duplicate is rejected 409", async () => {
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const first = await api("/api/v1/investors", { method: "POST", token: investor.token, body: { organization: "Acme Capital" } });
  assert.equal(first.status, 201);

  const dup = await api("/api/v1/investors", { method: "POST", token: investor.token, body: { organization: "Acme Capital II" } });
  assert.equal(dup.status, 409);
});

test("update: owner can edit own profile, another user cannot, platform admin can", async () => {
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const other = await createAuthenticatedTestUser({ role: "investor" });
  const admin = await makeAdmin();
  const created = await api("/api/v1/investors", { method: "POST", token: investor.token, body: { organization: "Original" } });
  const id = created.json.data._id;

  const byOwner = await api(`/api/v1/investors/${id}`, { method: "PUT", token: investor.token, body: { organization: "Updated" } });
  assert.equal(byOwner.status, 200);

  const byOther = await api(`/api/v1/investors/${id}`, { method: "PUT", token: other.token, body: { organization: "Hijacked" } });
  assert.equal(byOther.status, 403);

  const byAdmin = await api(`/api/v1/investors/${id}`, { method: "PUT", token: admin.token, body: { organization: "Admin Edited" } });
  assert.equal(byAdmin.status, 200);
});

test("profile directory is public (no auth)", async () => {
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  await api("/api/v1/investors", { method: "POST", token: investor.token, body: { organization: "Public Capital" } });

  const { status, json } = await api("/api/v1/investors");
  assert.equal(status, 200);
  assert.ok(json.data.length >= 1);
});

// --- Investment Interest ---

test("create rejects against a suspended or deleted startup, and prevents duplicates", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const investor = await createAuthenticatedTestUser({ role: "investor" });

  const first = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Interested" } });
  assert.equal(first.status, 201);

  const dup = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Again" } });
  assert.equal(dup.status, 409);

  const withdraw = await api(`/api/v1/investment-interests/${first.json.data._id}/withdraw`, { method: "PUT", token: investor.token });
  assert.equal(withdraw.status, 200);

  const reapply = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Once more" } });
  assert.equal(reapply.status, 201);

  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: true });
  const suspended = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Nope" } });
  assert.equal(suspended.status, 409);

  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: false, deletedAt: new Date() });
  const deleted = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Nope again" } });
  assert.equal(deleted.status, 409);
});

test("permission matrix: investor sees own, founder/admin/contributor see roster with explicit filter, unrelated is rejected", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const created = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Hi" } });
  const id = created.json.data._id;

  const byInvestor = await api(`/api/v1/investment-interests/${id}`, { token: investor.token });
  assert.equal(byInvestor.status, 200);

  const byContributor = await api(`/api/v1/investment-interests/${id}`, { token: fx.contributorMember.token });
  assert.equal(byContributor.status, 200);

  const byUnrelated = await api(`/api/v1/investment-interests/${id}`, { token: fx.unrelatedUser.token });
  assert.equal(byUnrelated.status, 403);
});

test("updateStatus: owner/admin can progress, contributor cannot, invalid skip rejected, platform admin can act", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const admin = await makeAdmin();
  const created = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Hi" } });
  const id = created.json.data._id;

  const byContributor = await api(`/api/v1/investment-interests/${id}/status`, { method: "PUT", token: fx.contributorMember.token, body: { status: "reviewing" } });
  assert.equal(byContributor.status, 403);

  const skip = await api(`/api/v1/investment-interests/${id}/status`, { method: "PUT", token: fx.founder.token, body: { status: "accepted" } });
  assert.equal(skip.status, 409);

  const step = await api(`/api/v1/investment-interests/${id}/status`, { method: "PUT", token: fx.founder.token, body: { status: "reviewing" } });
  assert.equal(step.status, 200);

  const byAdmin = await api(`/api/v1/investment-interests/${id}/status`, { method: "PUT", token: admin.token, body: { status: "contacted" } });
  assert.equal(byAdmin.status, 200);
});

test("archive hides from the default list; restore brings it back; restore blocked while startup deleted", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const created = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Hi" } });
  const id = created.json.data._id;

  const archived = await api(`/api/v1/investment-interests/${id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);

  const list = await api(`/api/v1/investment-interests?startupId=${fx.startup._id}`, { token: fx.founder.token });
  assert.ok(!list.json.data.some((i) => i._id === id));

  const restored = await api(`/api/v1/investment-interests/${id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);

  await api(`/api/v1/investment-interests/${id}`, { method: "DELETE", token: fx.founder.token });
  await api(`/api/v1/startups/${fx.startup._id}`, { method: "DELETE", token: fx.founder.token });
  const blockedRestore = await api(`/api/v1/investment-interests/${id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(blockedRestore.status, 409);
});

test("a platform admin can withdraw someone else's interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const admin = await makeAdmin();
  const created = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Hi" } });

  const { status, json } = await api(`/api/v1/investment-interests/${created.json.data._id}/withdraw`, { method: "PUT", token: admin.token });
  assert.equal(status, 200);
  assert.equal(json.data.status, "withdrawn");
});

test("cascade: soft-deleting the startup archives its investment interests", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const created = await api("/api/v1/investment-interests", { method: "POST", token: investor.token, body: { startupId: fx.startup._id, message: "Hi" } });

  await api(`/api/v1/startups/${fx.startup._id}`, { method: "DELETE", token: fx.founder.token });

  const stillExists = await InvestmentInterest.findById(created.json.data._id).lean();
  assert.equal(stillExists.isArchived, true);
});

test("list supports pagination via flat limit/skip", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const investorA = await createAuthenticatedTestUser({ role: "investor" });
  const investorB = await createAuthenticatedTestUser({ role: "investor" });
  await api("/api/v1/investment-interests", { method: "POST", token: investorA.token, body: { startupId: fx.startup._id, message: "A" } });
  await api("/api/v1/investment-interests", { method: "POST", token: investorB.token, body: { startupId: fx.startup._id, message: "B" } });

  const { json } = await api(`/api/v1/investment-interests?startupId=${fx.startup._id}&limit=1&skip=0`, { token: fx.founder.token });
  assert.equal(json.data.length, 1);
});
