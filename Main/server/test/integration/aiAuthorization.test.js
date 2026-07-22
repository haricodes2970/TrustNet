// AI module integration tests. Verifies aiService's orchestration,
// authorization INHERITANCE (no authorization logic of its own — every
// capability's access comes entirely from the service it calls), prompt
// construction, provider interaction, and error handling. Does NOT
// revalidate Analytics/Reports/domain-service business logic or
// aggregation correctness — that's already covered by their own test
// suites.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const aiService = require("../../src/services/aiService");
const aiProviderService = require("../../src/services/aiProviderService");
const analyticsService = require("../../src/services/analyticsService");
const taskService = require("../../src/services/taskService");
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

// --- Authorization inheritance ---

test("owner/admin/contributor can invoke an any-role capability (inherited from Analytics)", async () => {
  const fx = await createCollaborationFixture();
  for (const actor of [fx.founder, fx.adminMember, fx.contributorMember]) {
    const result = await aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, actor.user._id);
    assert.equal(result.capability, "startup-summary");
  }
});

test("unrelated user is denied an any-role capability — same error the underlying service would throw", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () => aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, fx.unrelatedUser.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("CONTRIBUTOR is denied report-explanation — inherits Reports' stricter owner/admin-only gate", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () =>
      aiService.generateInsight(
        "report-explanation",
        { startupId: fx.startup._id, reportType: "startup" },
        fx.contributorMember.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("owner CAN invoke report-explanation (inherits Reports' owner/admin-only gate)", async () => {
  const fx = await createCollaborationFixture();
  const result = await aiService.generateInsight(
    "report-explanation",
    { startupId: fx.startup._id, reportType: "startup" },
    fx.founder.user._id
  );
  assert.equal(result.capability, "report-explanation");
});

test("task-prioritization inherits the project's workspace-role authorization", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask({ projectId: fx.project._id, title: "Task 1" }, fx.founder.user._id);
  await taskService.updateTask(task._id, fx.founder.user._id, { status: "in_progress" });

  const result = await aiService.generateInsight(
    "task-prioritization",
    { startupId: fx.startup._id, projectId: fx.project._id },
    fx.contributorMember.user._id
  );
  assert.equal(result.contextSummary.totalTasks, 1);
});

test("task-prioritization denies an unrelated user with ApiError 403 (normalized from taskService's plain Error)", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () =>
      aiService.generateInsight(
        "task-prioritization",
        { startupId: fx.startup._id, projectId: fx.project._id },
        fx.unrelatedUser.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

// --- Context correctness (no drift vs. calling the underlying service directly) ---

test("startup-summary's contextSummary matches analyticsService.getOverview exactly", async () => {
  const fx = await createCollaborationFixture();
  const result = await aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, fx.founder.user._id);
  const analytics = await analyticsService.getOverview(fx.startup._id, fx.founder.user._id);
  assert.deepEqual(result.contextSummary, analytics);
});

test("analytics-interpretation dispatches to the requested section", async () => {
  const fx = await createCollaborationFixture();
  const result = await aiService.generateInsight(
    "analytics-interpretation",
    { startupId: fx.startup._id, section: "funding" },
    fx.founder.user._id
  );
  const analytics = await analyticsService.getFundingAnalytics(fx.startup._id, fx.founder.user._id);
  assert.deepEqual(result.contextSummary, analytics);
});

// --- Prompt construction reaches the provider ---

test("the assembled prompt (system prompt, context, question) reaches aiProviderService", async () => {
  const fx = await createCollaborationFixture();
  const result = await aiService.generateInsight(
    "startup-summary",
    { startupId: fx.startup._id, question: "How are we doing?" },
    fx.founder.user._id
  );
  assert.match(result.insight, /TrustNet AI assistant/);
  assert.match(result.insight, /How are we doing\?/);
  assert.match(result.insight, new RegExp(fx.startup.name));
});

// --- Provider failure handling ---

test("a provider failure surfaces as ApiError 502, not a raw 500", async () => {
  const fx = await createCollaborationFixture();
  const original = aiProviderService.generateCompletion;
  aiProviderService.generateCompletion = async () => {
    throw new Error("simulated provider outage");
  };

  try {
    await assert.rejects(
      () => aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, fx.founder.user._id),
      (error) => error instanceof ApiError && error.statusCode === 502
    );
  } finally {
    aiProviderService.generateCompletion = original;
  }
});

// --- Rate limiting ---

test("an 11th request within the window throws ApiError 429", async () => {
  const fx = await createCollaborationFixture();
  for (let i = 0; i < 10; i += 1) {
    await aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, fx.founder.user._id);
  }

  await assert.rejects(
    () => aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 429
  );
});

test("rate limiting is per-user — a different user is unaffected by another user's exhausted limit", async () => {
  const fx = await createCollaborationFixture();
  for (let i = 0; i < 10; i += 1) {
    await aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, fx.founder.user._id);
  }

  const result = await aiService.generateInsight("startup-summary", { startupId: fx.startup._id }, fx.adminMember.user._id);
  assert.equal(result.capability, "startup-summary");
});

// --- Validation ---

test("an invalid capability throws ApiError 400 before any authorization/DB work", async () => {
  await assert.rejects(
    () => aiService.generateInsight("not-a-real-capability", { startupId: "507f1f77bcf86cd799439011" }, "507f1f77bcf86cd799439099"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});

test("task-prioritization without projectId throws ApiError 400", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () => aiService.generateInsight("task-prioritization", { startupId: fx.startup._id }, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});

test("analytics-interpretation with an invalid section throws ApiError 400", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () =>
      aiService.generateInsight(
        "analytics-interpretation",
        { startupId: fx.startup._id, section: "not-a-real-section" },
        fx.founder.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});

test("report-explanation without reportType throws ApiError 400", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () => aiService.generateInsight("report-explanation", { startupId: fx.startup._id }, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});
