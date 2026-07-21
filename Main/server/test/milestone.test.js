const { test } = require("node:test");
const assert = require("node:assert/strict");
const { milestoneCreate, milestoneUpdate } = require("../src/validators/milestone.validators");
const { taskCreate, taskUpdate } = require("../src/validators/task.validators");

test("milestoneCreate accepts a minimal valid payload", () => {
  const { error } = milestoneCreate.validate({
    projectId: "507f1f77bcf86cd799439011",
    title: "Beta Release",
  });
  assert.equal(error, undefined);
});

test("milestoneCreate rejects a missing projectId", () => {
  const { error } = milestoneCreate.validate({ title: "Beta Release" });
  assert.ok(error);
  assert.match(error.message, /projectId/);
});

test("milestoneCreate rejects a title shorter than 2 chars", () => {
  const { error } = milestoneCreate.validate({
    projectId: "507f1f77bcf86cd799439011",
    title: "B",
  });
  assert.ok(error);
});

test("milestoneUpdate allows a partial payload with no required fields", () => {
  const { error } = milestoneUpdate.validate({ description: "Updated scope" });
  assert.equal(error, undefined);
});

test("milestoneUpdate rejects an invalid status value", () => {
  const { error } = milestoneUpdate.validate({ status: "done" });
  assert.ok(error);
});

test("taskCreate does not declare a milestone field (create-time milestone assignment is rejected by design, not by schema)", () => {
  // taskCreate uses .unknown(true), so Joi alone won't reject an extra
  // `milestone` key here — enforcement is in taskService.createTask, which
  // never reads or persists it. This test only documents that the schema
  // itself carries no explicit `milestone` rule at create time.
  assert.equal(Object.prototype.hasOwnProperty.call(taskCreate.describe().keys, "milestone"), false);
});

test("taskUpdate accepts a milestone field", () => {
  const { error } = taskUpdate.validate({ milestone: "507f1f77bcf86cd799439011" });
  assert.equal(error, undefined);
});

test("taskUpdate accepts milestone: null (unassigning)", () => {
  const { error } = taskUpdate.validate({ milestone: null });
  assert.equal(error, undefined);
});
