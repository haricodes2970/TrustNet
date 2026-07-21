// Phase 2, Section 3 (Task Authorization) + Section 5 (regression: Task list
// workspace/project-filter authorization). Verifies taskService against a
// real MongoDB instance. Out of scope: validators, controllers, routes,
// performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const taskService = require("../../src/services/taskService");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

// --- Owner/Admin: create, update, archive, assign ---

test("owner can create a task", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Owner-created task" },
    fx.founder.user._id
  );
  assert.equal(task.title, "Owner-created task");
  assert.equal(String(task.createdBy), String(fx.founder.user._id));
});

test("owner can assign a task to any active workspace member at creation", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Assigned by owner", assignedTo: fx.contributorMember.user._id },
    fx.founder.user._id
  );
  assert.equal(String(task.assignedTo), String(fx.contributorMember.user._id));
});

test("admin can update a task created by someone else", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Founder's task" },
    fx.founder.user._id
  );
  const updated = await taskService.updateTask(task._id, fx.adminMember.user._id, { title: "Edited by admin" });
  assert.equal(updated.title, "Edited by admin");
});

test("admin can archive a task created by someone else", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "To be archived by admin" },
    fx.founder.user._id
  );
  const archived = await taskService.archiveTask(task._id, fx.adminMember.user._id);
  assert.equal(archived.isArchived, true);
});

test("admin can reassign a task to any active workspace member", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask({ projectId: fx.project._id, title: "Reassign me" }, fx.founder.user._id);
  const updated = await taskService.updateTask(task._id, fx.adminMember.user._id, {
    assignedTo: fx.contributorMember.user._id,
  });
  assert.equal(String(updated.assignedTo), String(fx.contributorMember.user._id));
});

// --- Contributor: create, update own, archive own, assign self only ---

test("contributor can create a task (unassigned)", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Contributor-created task" },
    fx.contributorMember.user._id
  );
  assert.equal(String(task.createdBy), String(fx.contributorMember.user._id));
});

test("contributor can create a task self-assigned", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Self-assigned", assignedTo: fx.contributorMember.user._id },
    fx.contributorMember.user._id
  );
  assert.equal(String(task.assignedTo), String(fx.contributorMember.user._id));
});

test("contributor CANNOT create a task assigned to someone else", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () =>
      taskService.createTask(
        { projectId: fx.project._id, title: "Assign to other", assignedTo: fx.adminMember.user._id },
        fx.contributorMember.user._id
      ),
    /only assign tasks to themselves/
  );
});

test("contributor can update a task they created", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Mine" },
    fx.contributorMember.user._id
  );
  const updated = await taskService.updateTask(task._id, fx.contributorMember.user._id, { title: "Mine, edited" });
  assert.equal(updated.title, "Mine, edited");
});

test("contributor can update a task assigned to them (created by someone else)", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Assigned to contributor", assignedTo: fx.contributorMember.user._id },
    fx.founder.user._id
  );
  const updated = await taskService.updateTask(task._id, fx.contributorMember.user._id, {
    title: "Updated by assignee",
  });
  assert.equal(updated.title, "Updated by assignee");
});

test("contributor can archive a task they created", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Mine to archive" },
    fx.contributorMember.user._id
  );
  const archived = await taskService.archiveTask(task._id, fx.contributorMember.user._id);
  assert.equal(archived.isArchived, true);
});

test("contributor CANNOT edit another user's task (not created by or assigned to them)", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Founder's private task" },
    fx.founder.user._id
  );
  await assert.rejects(
    () => taskService.updateTask(task._id, fx.contributorMember.user._id, { title: "Hijacked" }),
    /not authorized/
  );
});

test("contributor CANNOT archive another user's task", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Founder's task to protect" },
    fx.founder.user._id
  );
  await assert.rejects(
    () => taskService.archiveTask(task._id, fx.contributorMember.user._id),
    /not authorized/
  );
});

test("contributor CANNOT reassign their own task to a third party", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask(
    { projectId: fx.project._id, title: "Mine, but not yours to give away" },
    fx.contributorMember.user._id
  );
  await assert.rejects(
    () =>
      taskService.updateTask(task._id, fx.contributorMember.user._id, {
        assignedTo: fx.adminMember.user._id,
      }),
    /only assign tasks to themselves/
  );
});

test("assigning a task to a pending (not-active) member is rejected", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () =>
      taskService.createTask(
        { projectId: fx.project._id, title: "Assign to pending member", assignedTo: fx.pendingMember.user._id },
        fx.founder.user._id
      ),
    /active member/
  );
});

// --- Unrelated users ---

test("unrelated user cannot create a task in the project", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () => taskService.createTask({ projectId: fx.project._id, title: "Intruder" }, fx.unrelatedUser.user._id),
    /not authorized/
  );
});

test("unrelated user cannot update a task in the project", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask({ projectId: fx.project._id, title: "Target" }, fx.founder.user._id);
  await assert.rejects(
    () => taskService.updateTask(task._id, fx.unrelatedUser.user._id, { title: "Tampered" }),
    /not authorized/
  );
});

test("unrelated user cannot archive a task in the project", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask({ projectId: fx.project._id, title: "Target" }, fx.founder.user._id);
  await assert.rejects(
    () => taskService.archiveTask(task._id, fx.unrelatedUser.user._id),
    /not authorized/
  );
});

test("unrelated user cannot view a task in the project", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask({ projectId: fx.project._id, title: "Target" }, fx.founder.user._id);
  await assert.rejects(
    () => taskService.assertTaskViewAccess(task, fx.unrelatedUser.user._id),
    /not authorized/
  );
});

// --- Regression: Task list project-filter authorization ---

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?projectId= filter", async () => {
  const fx = await createCollaborationFixture();
  await taskService.createTask({ projectId: fx.project._id, title: "Should stay hidden" }, fx.founder.user._id);

  await assert.rejects(
    () => taskService.listTasksForUser(fx.unrelatedUser.user._id, { project: fx.project._id }, {}),
    /not authorized/
  );
});

test("a user with project access CAN use an explicit ?projectId= filter to see tasks", async () => {
  const fx = await createCollaborationFixture();
  const task = await taskService.createTask({ projectId: fx.project._id, title: "Visible" }, fx.founder.user._id);

  const tasks = await taskService.listTasksForUser(fx.founder.user._id, { project: fx.project._id }, {});
  const ids = tasks.map((t) => String(t._id));
  assert.ok(ids.includes(String(task._id)));
});

test("an unrelated user sees no tasks via listTasksForUser with no filter", async () => {
  const fx = await createCollaborationFixture();
  await taskService.createTask({ projectId: fx.project._id, title: "Not yours" }, fx.founder.user._id);

  const tasks = await taskService.listTasksForUser(fx.unrelatedUser.user._id, {}, {});
  assert.equal(tasks.length, 0);
});
