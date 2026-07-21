const { test } = require("node:test");
const assert = require("node:assert/strict");
const { taskCreate, taskUpdate } = require("../src/validators/task.validators");
const { canMutateTask } = require("../src/services/serviceUtils");

test("taskCreate accepts a minimal valid payload", () => {
  const { error } = taskCreate.validate({
    projectId: "507f1f77bcf86cd799439011",
    title: "Write onboarding copy",
  });
  assert.equal(error, undefined);
});

test("taskCreate rejects a missing projectId", () => {
  const { error } = taskCreate.validate({ title: "Write onboarding copy" });
  assert.ok(error);
  assert.match(error.message, /projectId/);
});

test("taskCreate rejects an invalid priority value", () => {
  const { error } = taskCreate.validate({
    projectId: "507f1f77bcf86cd799439011",
    title: "Write onboarding copy",
    priority: "critical",
  });
  assert.ok(error);
});

test("taskUpdate rejects an invalid status value", () => {
  const { error } = taskUpdate.validate({ status: "finished" });
  assert.ok(error);
});

test("taskUpdate allows a partial payload with no required fields", () => {
  const { error } = taskUpdate.validate({ description: "Updated scope" });
  assert.equal(error, undefined);
});

test("canMutateTask: owner can mutate any task", () => {
  const task = { createdBy: "user-a", assignedTo: null };
  assert.equal(canMutateTask(task, "user-z", "owner"), true);
});

test("canMutateTask: admin can mutate any task", () => {
  const task = { createdBy: "user-a", assignedTo: "user-b" };
  assert.equal(canMutateTask(task, "user-z", "admin"), true);
});

test("canMutateTask: contributor can mutate a task they created", () => {
  const task = { createdBy: "user-x", assignedTo: null };
  assert.equal(canMutateTask(task, "user-x", "contributor"), true);
});

test("canMutateTask: contributor can mutate a task assigned to them", () => {
  const task = { createdBy: "user-a", assignedTo: "user-x" };
  assert.equal(canMutateTask(task, "user-x", "contributor"), true);
});

test("canMutateTask: contributor cannot mutate someone else's unassigned task", () => {
  const task = { createdBy: "user-a", assignedTo: null };
  assert.equal(canMutateTask(task, "user-x", "contributor"), false);
});

test("canMutateTask: no resolvable workspace role denies mutation", () => {
  const task = { createdBy: "user-x", assignedTo: "user-x" };
  assert.equal(canMutateTask(task, "user-x", null), false);
});
