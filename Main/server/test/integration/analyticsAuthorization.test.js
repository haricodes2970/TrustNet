// Analytics module integration tests. Verifies analyticsService (including
// its own locally-duplicated resolveStartupAccess — NOT workspaceService,
// NOT jobService, NOT investmentInterestService, NOT fundingRoundService,
// NOT engagementRequestService) against a real MongoDB instance, seeded
// with real cross-domain data via every completed module's own service.
// Out of scope: controllers, routes, performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture, createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const analyticsService = require("../../src/services/analyticsService");
const taskService = require("../../src/services/taskService");
const milestoneService = require("../../src/services/milestoneService");
const jobService = require("../../src/services/jobService");
const applicationService = require("../../src/services/applicationService");
const investmentInterestService = require("../../src/services/investmentInterestService");
const fundingRoundService = require("../../src/services/fundingRoundService");
const fundingContributionService = require("../../src/services/fundingContributionService");
const providerProfileService = require("../../src/services/providerProfileService");
const serviceListingService = require("../../src/services/serviceListingService");
const engagementRequestService = require("../../src/services/engagementRequestService");
const Startup = require("../../src/models/Startup");
const ApiError = require("../../src/utils/ApiError");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

function sampleResume(overrides = {}) {
  return {
    buffer: Buffer.from("%PDF-1.4 fixture resume content"),
    mimeType: "application/pdf",
    originalFileName: "resume.pdf",
    ...overrides,
  };
}

// Seeds one fully-populated startup across every domain with known
// quantities, so the returned counts can be asserted exactly, not just
// "greater than zero."
async function seedFullStartup() {
  const fx = await createCollaborationFixture();
  await Startup.findByIdAndUpdate(fx.startup._id, { status: "active" });

  // Tasks: 3 total, 2 done, 1 todo.
  const task1 = await taskService.createTask({ projectId: fx.project._id, title: "Task 1" }, fx.founder.user._id);
  const task2 = await taskService.createTask({ projectId: fx.project._id, title: "Task 2" }, fx.founder.user._id);
  await taskService.createTask({ projectId: fx.project._id, title: "Task 3" }, fx.founder.user._id);
  await taskService.updateTask(task1._id, fx.founder.user._id, { status: "done" });
  await taskService.updateTask(task2._id, fx.founder.user._id, { status: "done" });

  // Milestone: 1 planned.
  await milestoneService.createMilestone({ projectId: fx.project._id, title: "Milestone 1" }, fx.founder.user._id);

  // Job + Applications: 1 published job, 2 applications (1 submitted, 1 hired).
  const draftJob = await jobService.createJob(
    { startupId: fx.startup._id, title: "Founding Engineer", description: "Build things.", employmentType: "full-time", remotePolicy: "remote" },
    fx.founder.user._id
  );
  const job = await jobService.publishJob(draftJob._id, fx.founder.user._id);

  const candidateA = await createAuthenticatedTestUser();
  const candidateB = await createAuthenticatedTestUser();
  await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidateA.user._id);
  const appB = await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidateB.user._id);
  for (const status of ["under_review", "interview", "offer", "hired"]) {
    await applicationService.updateStatus(appB._id, fx.founder.user._id, { status });
  }

  // Investor: 1 interest, submitted.
  const investor = await createAuthenticatedTestUser();
  await investmentInterestService.createInterest({ startupId: fx.startup._id, message: "Interested." }, investor.user._id);

  // Funding: 1 open round, 2 contributions (1 confirmed for 1000, 1 pledged for 2000).
  const draftRound = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  const round = await fundingRoundService.openRound(draftRound._id, fx.founder.user._id);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();
  const contributionA = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investorA.user._id
  );
  await fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 2000, currency: "USD" }, investorB.user._id);
  await fundingContributionService.confirmContribution(contributionA._id, fx.founder.user._id);

  // Marketplace: 1 provider, 1 published listing, 1 requested engagement.
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

// --- Authorization: any role can view, unrelated blocked, missing startup 404 ---

test("owner/admin/contributor can access every analytics endpoint", async () => {
  const fx = await seedFullStartup();
  for (const actor of [fx.founder, fx.adminMember, fx.contributorMember]) {
    await analyticsService.getOverview(fx.startup._id, actor.user._id);
    await analyticsService.getProjectAnalytics(fx.startup._id, actor.user._id);
    await analyticsService.getTaskAnalytics(fx.startup._id, actor.user._id);
    await analyticsService.getHiringAnalytics(fx.startup._id, actor.user._id);
    await analyticsService.getFundingAnalytics(fx.startup._id, actor.user._id);
    await analyticsService.getMarketplaceAnalytics(fx.startup._id, actor.user._id);
  }
});

test("unrelated user CANNOT access any analytics endpoint — ApiError 403", async () => {
  const fx = await seedFullStartup();
  const checks = [
    analyticsService.getOverview,
    analyticsService.getProjectAnalytics,
    analyticsService.getTaskAnalytics,
    analyticsService.getHiringAnalytics,
    analyticsService.getFundingAnalytics,
    analyticsService.getMarketplaceAnalytics,
  ];
  for (const fn of checks) {
    await assert.rejects(
      () => fn(fx.startup._id, fx.unrelatedUser.user._id),
      (error) => error instanceof ApiError && error.statusCode === 403
    );
  }
});

test("a non-existent startupId throws ApiError 404", async () => {
  const user = await createAuthenticatedTestUser();
  await assert.rejects(
    () => analyticsService.getOverview("507f1f77bcf86cd799439011", user.user._id),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
});

test("a missing startupId throws ApiError 400", async () => {
  const user = await createAuthenticatedTestUser();
  await assert.rejects(
    () => analyticsService.getOverview(undefined, user.user._id),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});

// --- Correctness: exact counts against a known seed ---

test("project analytics reports correct counts", async () => {
  const fx = await seedFullStartup();
  const result = await analyticsService.getProjectAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(result.totalProjects, 1);
  assert.equal(result.projectsByStatus.planning, 1);
  assert.equal(result.totalMilestones, 1);
  assert.equal(result.milestonesByStatus.planned, 1);
});

test("task analytics reports correct counts and completion rate", async () => {
  const fx = await seedFullStartup();
  const result = await analyticsService.getTaskAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(result.totalTasks, 3);
  assert.equal(result.tasksByStatus.done, 2);
  assert.equal(result.tasksByStatus.todo, 1);
  assert.equal(result.completionRate, 66.67);
});

test("hiring analytics reports correct counts and conversion rate", async () => {
  const fx = await seedFullStartup();
  const result = await analyticsService.getHiringAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(result.totalJobs, 1);
  assert.equal(result.jobsByStatus.published, 1);
  assert.equal(result.totalApplications, 2);
  assert.equal(result.applicationsByStatus.submitted, 1);
  assert.equal(result.applicationsByStatus.hired, 1);
  assert.equal(result.conversionRate, 50);
});

test("funding analytics reports correct counts and totals", async () => {
  const fx = await seedFullStartup();
  const result = await analyticsService.getFundingAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(result.totalRounds, 1);
  assert.equal(result.roundsByStatus.open, 1);
  assert.equal(result.totalContributions, 2);
  assert.equal(result.contributionsByStatus.confirmed, 1);
  assert.equal(result.contributionsByStatus.pledged, 1);
  assert.equal(result.fundingRaised, 1000);
});

test("marketplace analytics reports correct counts", async () => {
  const fx = await seedFullStartup();
  const result = await analyticsService.getMarketplaceAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(result.totalRequests, 1);
  assert.equal(result.requestsByStatus.requested, 1);
  assert.equal(result.distinctProviderCount, 1);
});

test("overview reports the correct team size and investor summary", async () => {
  const fx = await seedFullStartup();
  const result = await analyticsService.getOverview(fx.startup._id, fx.founder.user._id);
  assert.equal(result.startup.teamSize, 3); // founder + adminMember + contributorMember, pendingMember excluded
  assert.equal(result.investors.distinctInvestorCount, 1);
  assert.equal(result.investors.interestsByStatus.submitted, 1);
});

test("overview's per-domain numbers match the dedicated endpoints for the same startup (no drift)", async () => {
  const fx = await seedFullStartup();
  const overview = await analyticsService.getOverview(fx.startup._id, fx.founder.user._id);
  const projects = await analyticsService.getProjectAnalytics(fx.startup._id, fx.founder.user._id);
  const tasks = await analyticsService.getTaskAnalytics(fx.startup._id, fx.founder.user._id);
  const hiring = await analyticsService.getHiringAnalytics(fx.startup._id, fx.founder.user._id);
  const funding = await analyticsService.getFundingAnalytics(fx.startup._id, fx.founder.user._id);
  const marketplace = await analyticsService.getMarketplaceAnalytics(fx.startup._id, fx.founder.user._id);

  assert.deepEqual(overview.projects, projects);
  assert.deepEqual(overview.tasks, tasks);
  assert.deepEqual(overview.hiring, hiring);
  assert.deepEqual(overview.funding, funding);
  assert.deepEqual(overview.marketplace, marketplace);
});

// --- Zero-state: a startup with no activity returns real zeros, not errors ---

test("a startup with no Workspace/Project returns zero-valued project and task analytics", async () => {
  const fx = await createStartupTeamFixture();
  const projects = await analyticsService.getProjectAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(projects.totalProjects, 0);
  assert.equal(projects.totalMilestones, 0);

  const tasks = await analyticsService.getTaskAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(tasks.totalTasks, 0);
  assert.equal(tasks.completionRate, 0);
});

test("a startup with no jobs/funding/marketplace activity returns zero-valued analytics", async () => {
  const fx = await createStartupTeamFixture();

  const hiring = await analyticsService.getHiringAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(hiring.totalJobs, 0);
  assert.equal(hiring.totalApplications, 0);
  assert.equal(hiring.conversionRate, 0);

  const funding = await analyticsService.getFundingAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(funding.totalRounds, 0);
  assert.equal(funding.fundingRaised, 0);

  const marketplace = await analyticsService.getMarketplaceAnalytics(fx.startup._id, fx.founder.user._id);
  assert.equal(marketplace.totalRequests, 0);
  assert.equal(marketplace.distinctProviderCount, 0);
});
