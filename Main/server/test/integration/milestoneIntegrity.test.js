// Phase 2, Section 4: Milestone Integrity.
// Verifies the cross-project milestone-assignment guard
// (taskService.assertMilestoneBelongsToProject, exercised through the public
// taskService.updateTask API since the guard itself is not exported) against
// a real MongoDB instance. Out of scope: validators, controllers, routes,
// performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const taskService = require("../../src/services/taskService");
const projectService = require("../../src/services/projectService");
const milestoneService = require("../../src/services/milestoneService");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

test("a task can be assigned to a milestone belonging to the same project", async () => {
  const fx = await createCollaborationFixture();

  const milestone = await milestoneService.createMilestone(
    { projectId: fx.project._id, title: "Beta Release" },
    fx.founder.user._id
  );
  const task = await taskService.createTask({ projectId: fx.project._id, title: "Ship the beta" }, fx.founder.user._id);

  const updated = await taskService.updateTask(task._id, fx.founder.user._id, { milestone: milestone._id });
  assert.equal(String(updated.milestone), String(milestone._id));
});

test("REJECTS: a task cannot be assigned to a milestone belonging to a different project", async () => {
  const fx = await createCollaborationFixture();

  // A second project in the same workspace — same permission chain, different parent project.
  const otherProject = await projectService.createProject(
    { workspaceId: fx.workspace._id, name: "Other Project" },
    fx.founder.user._id
  );
  const milestoneOnOtherProject = await milestoneService.createMilestone(
    { projectId: otherProject._id, title: "Other Project's Milestone" },
    fx.founder.user._id
  );
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Task in the original project" },
    fx.founder.user._id
  );

  await assert.rejects(
    () => taskService.updateTask(task._id, fx.founder.user._id, { milestone: milestoneOnOtherProject._id }),
    /does not belong to the task's project/
  );
});

test("a task's milestone can be cleared (set to null)", async () => {
  const fx = await createCollaborationFixture();
  const milestone = await milestoneService.createMilestone(
    { projectId: fx.project._id, title: "Beta Release" },
    fx.founder.user._id
  );
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Ship the beta", milestone: undefined },
    fx.founder.user._id
  );
  await taskService.updateTask(task._id, fx.founder.user._id, { milestone: milestone._id });

  const cleared = await taskService.updateTask(task._id, fx.founder.user._id, { milestone: null });
  assert.equal(cleared.milestone, null);
});

test("milestone assignment is update-only: creating a task with a milestone in the payload does not persist it", async () => {
  const fx = await createCollaborationFixture();
  const milestone = await milestoneService.createMilestone(
    { projectId: fx.project._id, title: "Beta Release" },
    fx.founder.user._id
  );

  // createTask's destructured params never read `milestone` at all — passing
  // it here documents that it's silently ignored, not rejected.
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Created with milestone in payload", milestone: milestone._id },
    fx.founder.user._id
  );
  assert.equal(task.milestone, null);
});
