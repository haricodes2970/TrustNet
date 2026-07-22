// Reports module integration tests. Verifies reportService (a
// presentation/export layer that reuses analyticsService.resolveStartupAccess/
// assertAnyRole directly — NOT a seventh local Startup authorization
// helper) against a real MongoDB instance. Out of scope: controllers,
// routes, PDF (not implemented this phase — see BACKLOG.md).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const reportService = require("../../src/services/reportService");
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

const REPORT_TYPES = ["startup", "projects", "tasks", "hiring", "funding", "marketplace"];

async function seedStartupWithTasks() {
  const fx = await createCollaborationFixture();
  const task1 = await taskService.createTask({ projectId: fx.project._id, title: "Task 1" }, fx.founder.user._id);
  await taskService.createTask({ projectId: fx.project._id, title: "Task 2" }, fx.founder.user._id);
  await taskService.updateTask(task1._id, fx.founder.user._id, { status: "done" });
  return fx;
}

// --- Authorization: owner/admin allowed, contributor and unrelated denied ---

test("owner and admin can generate every report type", async () => {
  const fx = await seedStartupWithTasks();
  for (const actor of [fx.founder, fx.adminMember]) {
    for (const reportType of REPORT_TYPES) {
      const result = await reportService.generateReport(reportType, fx.startup._id, actor.user._id, "json");
      assert.equal(result.format, "json");
      assert.equal(result.report.reportType, reportType);
    }
  }
});

test("CONTRIBUTOR is denied report generation — ApiError 403 (diverges from Analytics' any-role gate)", async () => {
  const fx = await seedStartupWithTasks();
  for (const reportType of REPORT_TYPES) {
    await assert.rejects(
      () => reportService.generateReport(reportType, fx.startup._id, fx.contributorMember.user._id, "json"),
      (error) => error instanceof ApiError && error.statusCode === 403
    );
  }
});

test("unrelated user is denied report generation — ApiError 403", async () => {
  const fx = await seedStartupWithTasks();
  await assert.rejects(
    () => reportService.generateReport("tasks", fx.startup._id, fx.unrelatedUser.user._id, "json"),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("a contributor CAN still view the same data via Analytics directly (confirms the divergence is deliberate, not a shared bug)", async () => {
  const fx = await seedStartupWithTasks();
  const analytics = await analyticsService.getTaskAnalytics(fx.startup._id, fx.contributorMember.user._id);
  assert.equal(analytics.totalTasks, 2);
});

// --- Correctness: JSON output matches Analytics exactly (no drift) ---

test("format=json 'tasks' report data matches analyticsService.getTaskAnalytics exactly", async () => {
  const fx = await seedStartupWithTasks();
  const result = await reportService.generateReport("tasks", fx.startup._id, fx.founder.user._id, "json");
  const analytics = await analyticsService.getTaskAnalytics(fx.startup._id, fx.founder.user._id);
  assert.deepEqual(result.report.data, analytics);
});

test("format=json 'startup' report data matches analyticsService.getOverview exactly", async () => {
  const fx = await seedStartupWithTasks();
  const result = await reportService.generateReport("startup", fx.startup._id, fx.founder.user._id, "json");
  const analytics = await analyticsService.getOverview(fx.startup._id, fx.founder.user._id);
  assert.deepEqual(result.report.data, analytics);
});

test("the report envelope carries reportType, startupId, and a recent generatedAt timestamp", async () => {
  const fx = await seedStartupWithTasks();
  const before = Date.now();
  const result = await reportService.generateReport("tasks", fx.startup._id, fx.founder.user._id, "json");
  const generatedAtMs = new Date(result.report.generatedAt).getTime();

  assert.equal(result.report.reportType, "tasks");
  assert.equal(String(result.report.startupId), String(fx.startup._id));
  assert.ok(generatedAtMs >= before && generatedAtMs <= Date.now());
});

// --- CSV serialization ---

test("format=csv returns a valid CSV body with a header row and the expected fields", async () => {
  const fx = await seedStartupWithTasks();
  const result = await reportService.generateReport("tasks", fx.startup._id, fx.founder.user._id, "csv");
  assert.equal(result.format, "csv");
  const lines = result.csv.split("\r\n");
  assert.equal(lines[0], "metric,value");
  assert.ok(lines.includes("data.totalTasks,2"));
  assert.ok(lines.includes("data.tasksByStatus.done,1"));
  assert.ok(lines.includes("reportType,tasks"));
});

test("format=csv escapes a comma in the startup name", async () => {
  const fx = await seedStartupWithTasks();
  const Startup = require("../../src/models/Startup");
  await Startup.findByIdAndUpdate(fx.startup._id, { name: "Acme, Inc." });

  const result = await reportService.generateReport("startup", fx.startup._id, fx.founder.user._id, "csv");
  assert.ok(result.csv.includes('data.startup.name,"Acme, Inc."'));
});

// --- Validation: reportType, format, startupId ---

test("an invalid reportType throws ApiError 400", async () => {
  const fx = await seedStartupWithTasks();
  await assert.rejects(
    () => reportService.generateReport("not-a-real-type", fx.startup._id, fx.founder.user._id, "json"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});

test("an invalid format throws ApiError 400", async () => {
  const fx = await seedStartupWithTasks();
  await assert.rejects(
    () => reportService.generateReport("tasks", fx.startup._id, fx.founder.user._id, "xml"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});

test("a missing startupId throws ApiError 400", async () => {
  const user = await createAuthenticatedTestUser();
  await assert.rejects(
    () => reportService.generateReport("tasks", undefined, user.user._id, "json"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});

test("a non-existent startupId throws ApiError 404", async () => {
  const user = await createAuthenticatedTestUser();
  await assert.rejects(
    () => reportService.generateReport("tasks", "507f1f77bcf86cd799439011", user.user._id, "json"),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
});

test("invalid reportType is rejected before any authorization check (no DB role lookup needed)", async () => {
  const user = await createAuthenticatedTestUser();
  await assert.rejects(
    () => reportService.generateReport("not-a-real-type", "507f1f77bcf86cd799439011", user.user._id, "json"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});
