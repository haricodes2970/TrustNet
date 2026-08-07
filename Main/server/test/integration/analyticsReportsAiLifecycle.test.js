// Analytics + Reports + AI HTTP-level integration tests (Analytics +
// Reports + AI hardening phase). Runs the real Express app over HTTP
// against an in-memory MongoDB instance. Complements the existing,
// thorough service-level analyticsAuthorization.test.js/report.test.js/
// ai.test.js/aiAuthorization.test.js - this file exercises the actual
// request path (route params are always strings), which is exactly where
// this phase's critical finding lived: Model.aggregate()'s $match stage
// does not get Mongoose's automatic string->ObjectId casting the way
// .find() does, so hiring/investor/marketplace analytics silently
// returned zero for every real HTTP request despite every prior unit test
// passing (they call the service directly with a real ObjectId, never a
// string).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const Startup = require("../../src/models/Startup");
const jobService = require("../../src/services/jobService");
const investmentInterestService = require("../../src/services/investmentInterestService");
const providerProfileService = require("../../src/services/providerProfileService");
const serviceListingService = require("../../src/services/serviceListingService");
const engagementRequestService = require("../../src/services/engagementRequestService");

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
  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await res.json().catch(() => null) : await res.text();
  return { status: res.status, json: contentType.includes("application/json") ? payload : null, text: contentType.includes("application/json") ? null : payload, headers: res.headers };
}

// Seeds one Job (published), one InvestmentInterest, and one published
// ServiceListing + EngagementRequest - exactly the three domains whose
// aggregate $match was broken by the string-vs-ObjectId bug this phase
// fixed. Deliberately lighter than analyticsAuthorization.test.js's
// seedFullStartup() - this file's job is to prove the real HTTP path
// works, not to re-prove every count in isolation (already covered).
async function seedForAggregateRegression() {
  const fx = await createCollaborationFixture();
  await Startup.findByIdAndUpdate(fx.startup._id, { status: "active" });

  const draftJob = await jobService.createJob(
    { startupId: fx.startup._id, title: "Founding Engineer", description: "Build things.", employmentType: "full-time", remotePolicy: "remote" },
    fx.founder.user._id
  );
  await jobService.publishJob(draftJob._id, fx.founder.user._id);

  const investor = await createAuthenticatedTestUser();
  await investmentInterestService.createInterest({ startupId: fx.startup._id, message: "Interested." }, investor.user._id);

  const provider = await createAuthenticatedTestUser();
  await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);
  const draftListing = await serviceListingService.createListing(
    { title: "Brand Strategy", category: "Marketing", description: "Full brand overhaul.", pricingModel: "fixed" },
    provider.user._id
  );
  const listing = await serviceListingService.publishListing(draftListing._id, provider.user._id);
  await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  return fx;
}

// --- Analytics: the real HTTP path (regression test for the aggregate bug) ---

test("hiring analytics over real HTTP reports the true count, not zero", async () => {
  const fx = await seedForAggregateRegression();
  const { status, json } = await api(`/api/v1/analytics/hiring?startupId=${fx.startup._id}`, { token: fx.founder.token });
  assert.equal(status, 200);
  assert.equal(json.data.totalJobs, 1);
  assert.equal(json.data.jobsByStatus.published, 1);
});

test("marketplace analytics over real HTTP reports the true count, not zero", async () => {
  const fx = await seedForAggregateRegression();
  const { status, json } = await api(`/api/v1/analytics/marketplace?startupId=${fx.startup._id}`, { token: fx.founder.token });
  assert.equal(status, 200);
  assert.equal(json.data.totalRequests, 1);
  assert.equal(json.data.distinctProviderCount, 1);
});

test("overview over real HTTP reports true hiring/marketplace/investor counts, not zero", async () => {
  const fx = await seedForAggregateRegression();
  const { status, json } = await api(`/api/v1/analytics/overview?startupId=${fx.startup._id}`, { token: fx.founder.token });
  assert.equal(status, 200);
  assert.equal(json.data.hiring.totalJobs, 1);
  assert.equal(json.data.marketplace.totalRequests, 1);
  assert.equal(json.data.investors.distinctInvestorCount, 1);
});

test("a malformed startupId returns a clean 400, not a raw 500", async () => {
  const user = await createAuthenticatedTestUser();
  const { status, json } = await api("/api/v1/analytics/hiring?startupId=not-a-valid-id", { token: user.token });
  assert.equal(status, 400);
  assert.equal(json.message, "Invalid startupId.");
});

// --- Reports ---

test("JSON report: owner/admin allowed, contributor rejected, audit log written", async () => {
  const fx = await seedForAggregateRegression();

  const byOwner = await api(`/api/v1/reports/hiring?startupId=${fx.startup._id}`, { token: fx.founder.token });
  assert.equal(byOwner.status, 200);
  assert.equal(byOwner.json.data.reportType, "hiring");
  assert.equal(byOwner.json.data.data.totalJobs, 1);

  const byContributor = await api(`/api/v1/reports/hiring?startupId=${fx.startup._id}`, { token: fx.contributorMember.token });
  assert.equal(byContributor.status, 403);
});

test("CSV report: correct content-type/headers and flattened rows", async () => {
  const fx = await seedForAggregateRegression();
  const { status, text, headers } = await api(`/api/v1/reports/marketplace?startupId=${fx.startup._id}&format=csv`, {
    token: fx.founder.token,
  });
  assert.equal(status, 200);
  assert.ok(headers.get("content-type").includes("text/csv"));
  assert.ok(headers.get("content-disposition").includes("marketplace-report.csv"));
  assert.ok(text.startsWith("metric,value"));
  assert.ok(text.includes("data.totalRequests,1"));
});

test("an empty startup (no activity) produces a correct zero-valued report", async () => {
  const fx = await createCollaborationFixture();
  await Startup.findByIdAndUpdate(fx.startup._id, { status: "active" });
  const { status, json } = await api(`/api/v1/reports/hiring?startupId=${fx.startup._id}`, { token: fx.founder.token });
  assert.equal(status, 200);
  assert.equal(json.data.data.totalJobs, 0);
  assert.equal(json.data.data.conversionRate, 0);
});

test("an invalid report type returns 400", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await api(`/api/v1/reports/not-a-real-type?startupId=${fx.startup._id}`, { token: fx.founder.token });
  assert.equal(status, 400);
});

// --- AI ---

test("startup-summary insight succeeds for the owner and embeds the safety preamble and real context in the response", async () => {
  const fx = await seedForAggregateRegression();
  const { status, json } = await api("/api/v1/ai/insights", {
    method: "POST",
    token: fx.founder.token,
    body: { capability: "startup-summary", startupId: String(fx.startup._id) },
  });
  assert.equal(status, 200);
  assert.equal(json.data.capability, "startup-summary");
  assert.ok(json.data.insight.includes("TrustNet AI assistant"));
  assert.ok(json.data.insight.includes("Never invent figures"));
  assert.equal(json.data.contextSummary.hiring.totalJobs, 1);
});

test("hiring-insights capability reflects the aggregate-bug fix through the AI orchestration layer too", async () => {
  const fx = await seedForAggregateRegression();
  const { status, json } = await api("/api/v1/ai/insights", {
    method: "POST",
    token: fx.founder.token,
    body: { capability: "hiring-insights", startupId: String(fx.startup._id) },
  });
  assert.equal(status, 200);
  assert.equal(json.data.contextSummary.totalJobs, 1);
});

test("report-explanation capability inherits Reports' stricter owner/admin-only gate", async () => {
  const fx = await seedForAggregateRegression();
  const { status } = await api("/api/v1/ai/insights", {
    method: "POST",
    token: fx.contributorMember.token,
    body: { capability: "report-explanation", startupId: String(fx.startup._id), reportType: "hiring" },
  });
  assert.equal(status, 403);
});

test("an unrelated user is rejected for an authenticated capability, inherited from the underlying service", async () => {
  const fx = await seedForAggregateRegression();
  const { status } = await api("/api/v1/ai/insights", {
    method: "POST",
    token: fx.unrelatedUser.token,
    body: { capability: "startup-summary", startupId: String(fx.startup._id) },
  });
  assert.equal(status, 403);
});

test("an invalid capability returns 400", async () => {
  const user = await createAuthenticatedTestUser();
  const { status } = await api("/api/v1/ai/insights", {
    method: "POST",
    token: user.token,
    body: { capability: "not-a-real-capability", startupId: "507f1f77bcf86cd799439011" },
  });
  assert.equal(status, 400);
});

test("task-prioritization without projectId returns 400", async () => {
  const fx = await seedForAggregateRegression();
  const { status } = await api("/api/v1/ai/insights", {
    method: "POST",
    token: fx.founder.token,
    body: { capability: "task-prioritization", startupId: String(fx.startup._id) },
  });
  assert.equal(status, 400);
});

test("aiService's in-memory per-user rate limit returns 429 after the configured burst", async () => {
  const fx = await seedForAggregateRegression();
  let lastStatus;
  for (let i = 0; i < 11; i += 1) {
    const { status } = await api("/api/v1/ai/insights", {
      method: "POST",
      token: fx.founder.token,
      body: { capability: "startup-summary", startupId: String(fx.startup._id) },
    });
    lastStatus = status;
  }
  assert.equal(lastStatus, 429);
});
