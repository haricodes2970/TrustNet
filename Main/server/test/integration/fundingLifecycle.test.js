// FundingRound + FundingContribution integration tests (Investors & Funding
// phase). Runs the real Express app over HTTP against an in-memory MongoDB
// instance. Complements the existing thorough service-level
// fundingAuthorization.test.js - this file exercises routes/controller/
// validators plus everything added in this phase: FundingRound archive/
// restore (brand new - didn't exist before), platform-admin override on
// both modules, startup-state guards, and financial-integrity assertions.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const Startup = require("../../src/models/Startup");
const FundingRound = require("../../src/models/FundingRound");

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

async function activateStartup(startupId) {
  await Startup.findByIdAndUpdate(startupId, { status: "active" });
}

function roundPayload(startupId, overrides = {}) {
  return {
    startupId: String(startupId),
    title: `Round ${Date.now()}${Math.floor(Math.random() * 1e6)}`,
    roundType: "seed",
    targetAmount: 100000,
    currency: "USD",
    ...overrides,
  };
}

async function createOpenRound(fx, token, overrides = {}) {
  await activateStartup(fx.startup._id);
  const created = await api("/api/v1/funding-rounds", { method: "POST", token, body: roundPayload(fx.startup._id, overrides) });
  const opened = await api(`/api/v1/funding-rounds/${created.json.data._id}/open`, { method: "PUT", token });
  return opened.json.data;
}

// --- FundingRound ---

test("create rejects a deleted startup with 409, contributor with 403", async () => {
  const fx = await createStartupTeamFixture();
  const byContributor = await api("/api/v1/funding-rounds", { method: "POST", token: fx.contributorMember.token, body: roundPayload(fx.startup._id) });
  assert.equal(byContributor.status, 403);

  await Startup.findByIdAndUpdate(fx.startup._id, { deletedAt: new Date() });
  const { status } = await api("/api/v1/funding-rounds", { method: "POST", token: fx.founder.token, body: roundPayload(fx.startup._id) });
  assert.equal(status, 409);
});

test("full lifecycle: draft -> open -> close; open rejects a suspended startup", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const created = await api("/api/v1/funding-rounds", { method: "POST", token: fx.founder.token, body: roundPayload(fx.startup._id) });
  const id = created.json.data._id;
  assert.equal(created.json.data.status, "draft");

  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: true });
  const blockedOpen = await api(`/api/v1/funding-rounds/${id}/open`, { method: "PUT", token: fx.founder.token });
  assert.equal(blockedOpen.status, 409);

  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: false });
  const opened = await api(`/api/v1/funding-rounds/${id}/open`, { method: "PUT", token: fx.founder.token });
  assert.equal(opened.status, 200);
  assert.equal(opened.json.data.status, "open");

  const reopen = await api(`/api/v1/funding-rounds/${id}/open`, { method: "PUT", token: fx.founder.token });
  assert.equal(reopen.status, 409);

  const closed = await api(`/api/v1/funding-rounds/${id}/close`, { method: "PUT", token: fx.founder.token });
  assert.equal(closed.status, 200);
  assert.equal(closed.json.data.status, "closed");
});

test("cancel a draft round; archive/restore is new functionality (didn't exist before this phase)", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const created = await api("/api/v1/funding-rounds", { method: "POST", token: fx.founder.token, body: roundPayload(fx.startup._id) });
  const id = created.json.data._id;

  const archived = await api(`/api/v1/funding-rounds/${id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);

  const restored = await api(`/api/v1/funding-rounds/${id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);

  const cancelled = await api(`/api/v1/funding-rounds/${id}/cancel`, { method: "PUT", token: fx.founder.token });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.json.data.status, "cancelled");

  const invalidTransition = await api(`/api/v1/funding-rounds/${id}/open`, { method: "PUT", token: fx.founder.token });
  assert.equal(invalidTransition.status, 409);
});

test("a platform admin can create/open/close/archive/restore a round for a startup they have no role in", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const admin = await makeAdmin();

  const created = await api("/api/v1/funding-rounds", { method: "POST", token: admin.token, body: roundPayload(fx.startup._id) });
  assert.equal(created.status, 201);
  const id = created.json.data._id;

  const opened = await api(`/api/v1/funding-rounds/${id}/open`, { method: "PUT", token: admin.token });
  assert.equal(opened.status, 200);

  const closed = await api(`/api/v1/funding-rounds/${id}/close`, { method: "PUT", token: admin.token });
  assert.equal(closed.status, 200);

  const archived = await api(`/api/v1/funding-rounds/${id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);

  const restored = await api(`/api/v1/funding-rounds/${id}/restore`, { method: "POST", token: admin.token });
  assert.equal(restored.status, 200);
});

test("get conceals a non-open round from an unrelated user (404), public sees open rounds", async () => {
  const fx = await createStartupTeamFixture();
  const round = await createOpenRound(fx, fx.founder.token);

  const publicView = await api(`/api/v1/funding-rounds/${round._id}`);
  assert.equal(publicView.status, 200);

  const draft = await api("/api/v1/funding-rounds", { method: "POST", token: fx.founder.token, body: roundPayload(fx.startup._id) });
  const concealed = await api(`/api/v1/funding-rounds/${draft.json.data._id}`, { token: fx.unrelatedUser.token });
  assert.equal(concealed.status, 404);
});

test("list supports search and pagination", async () => {
  const fx = await createStartupTeamFixture();
  await createOpenRound(fx, fx.founder.token, { title: "Searchable Seed Round" });
  await createOpenRound(fx, fx.founder.token, { title: "Another Round" });

  const searched = await api("/api/v1/funding-rounds?search=Searchable");
  assert.equal(searched.json.data.length, 1);

  const paged = await api("/api/v1/funding-rounds?limit=1&skip=0");
  assert.equal(paged.json.data.length, 1);
});

// --- FundingContribution ---

test("create rejects wrong currency, a non-open round, and a suspended startup's round", async () => {
  const fx = await createStartupTeamFixture();
  const round = await createOpenRound(fx, fx.founder.token);
  const investor = await createAuthenticatedTestUser({ role: "investor" });

  const wrongCurrency = await api("/api/v1/funding-contributions", { method: "POST", token: investor.token, body: { fundingRoundId: round._id, amount: 1000, currency: "EUR" } });
  assert.equal(wrongCurrency.status, 409);

  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: true });
  const suspended = await api("/api/v1/funding-contributions", { method: "POST", token: investor.token, body: { fundingRoundId: round._id, amount: 1000, currency: "USD" } });
  assert.equal(suspended.status, 409);
  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: false });

  const draftFx = await createStartupTeamFixture();
  await activateStartup(draftFx.startup._id);
  const draftRound = await api("/api/v1/funding-rounds", { method: "POST", token: draftFx.founder.token, body: roundPayload(draftFx.startup._id) });
  const toDraft = await api("/api/v1/funding-contributions", { method: "POST", token: investor.token, body: { fundingRoundId: draftRound.json.data._id, amount: 1000, currency: "USD" } });
  assert.equal(toDraft.status, 409);
});

test("confirm atomically updates FundingRound.raisedAmount and Startup.fundingRaised; double-confirm is rejected", async () => {
  const fx = await createStartupTeamFixture();
  const round = await createOpenRound(fx, fx.founder.token);
  const investor = await createAuthenticatedTestUser({ role: "investor" });

  const pledged = await api("/api/v1/funding-contributions", { method: "POST", token: investor.token, body: { fundingRoundId: round._id, amount: 5000, currency: "USD" } });
  assert.equal(pledged.status, 201);

  const confirmed = await api(`/api/v1/funding-contributions/${pledged.json.data._id}/confirm`, { method: "PUT", token: fx.founder.token });
  assert.equal(confirmed.status, 200);

  const roundAfter = await FundingRound.findById(round._id).lean();
  assert.equal(roundAfter.raisedAmount, 5000);
  const startupAfter = await Startup.findById(fx.startup._id).lean();
  assert.equal(startupAfter.fundingRaised, 5000);

  const doubleConfirm = await api(`/api/v1/funding-contributions/${pledged.json.data._id}/confirm`, { method: "PUT", token: fx.founder.token });
  assert.equal(doubleConfirm.status, 409);

  // Totals must not have been double-incremented by the rejected retry.
  const roundFinal = await FundingRound.findById(round._id).lean();
  assert.equal(roundFinal.raisedAmount, 5000);
});

test("reject a pledged contribution; withdraw own; cannot withdraw after confirmation", async () => {
  const fx = await createStartupTeamFixture();
  const round = await createOpenRound(fx, fx.founder.token);
  const investorA = await createAuthenticatedTestUser({ role: "investor" });
  const investorB = await createAuthenticatedTestUser({ role: "investor" });

  const pledgeA = await api("/api/v1/funding-contributions", { method: "POST", token: investorA.token, body: { fundingRoundId: round._id, amount: 1000, currency: "USD" } });
  const rejected = await api(`/api/v1/funding-contributions/${pledgeA.json.data._id}/reject`, { method: "PUT", token: fx.founder.token });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.json.data.status, "rejected");

  const pledgeB = await api("/api/v1/funding-contributions", { method: "POST", token: investorB.token, body: { fundingRoundId: round._id, amount: 2000, currency: "USD" } });
  const confirmedB = await api(`/api/v1/funding-contributions/${pledgeB.json.data._id}/confirm`, { method: "PUT", token: fx.founder.token });
  assert.equal(confirmedB.status, 200);
  const blockedWithdraw = await api(`/api/v1/funding-contributions/${pledgeB.json.data._id}/withdraw`, { method: "PUT", token: investorB.token });
  assert.equal(blockedWithdraw.status, 409);
});

test("a platform admin can confirm a contribution for a startup they have no role in", async () => {
  const fx = await createStartupTeamFixture();
  const round = await createOpenRound(fx, fx.founder.token);
  const investor = await createAuthenticatedTestUser({ role: "investor" });
  const admin = await makeAdmin();

  const pledged = await api("/api/v1/funding-contributions", { method: "POST", token: investor.token, body: { fundingRoundId: round._id, amount: 1500, currency: "USD" } });
  const { status } = await api(`/api/v1/funding-contributions/${pledged.json.data._id}/confirm`, { method: "PUT", token: admin.token });
  assert.equal(status, 200);
});

test("cascade: soft-deleting the startup archives its open round, blocking new contributions", async () => {
  const fx = await createStartupTeamFixture();
  const round = await createOpenRound(fx, fx.founder.token);
  const investor = await createAuthenticatedTestUser({ role: "investor" });

  await api(`/api/v1/startups/${fx.startup._id}`, { method: "DELETE", token: fx.founder.token });

  const { status } = await api("/api/v1/funding-contributions", { method: "POST", token: investor.token, body: { fundingRoundId: round._id, amount: 500, currency: "USD" } });
  assert.equal(status, 409);
});

test("list: investor sees only own contributions; owner/platform admin see roster with explicit filter", async () => {
  const fx = await createStartupTeamFixture();
  const round = await createOpenRound(fx, fx.founder.token);
  const investorA = await createAuthenticatedTestUser({ role: "investor" });
  const investorB = await createAuthenticatedTestUser({ role: "investor" });
  await api("/api/v1/funding-contributions", { method: "POST", token: investorA.token, body: { fundingRoundId: round._id, amount: 100, currency: "USD" } });
  await api("/api/v1/funding-contributions", { method: "POST", token: investorB.token, body: { fundingRoundId: round._id, amount: 200, currency: "USD" } });

  const ownList = await api("/api/v1/funding-contributions", { token: investorA.token });
  assert.equal(ownList.json.data.length, 1);

  const admin = await makeAdmin();
  const roster = await api(`/api/v1/funding-contributions?fundingRoundId=${round._id}`, { token: admin.token });
  assert.equal(roster.json.data.length, 2);
});
