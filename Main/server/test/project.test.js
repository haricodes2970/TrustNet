const { test } = require("node:test");
const assert = require("node:assert/strict");
const { projectCreate, projectUpdate } = require("../src/validators/project.validators");

test("projectCreate accepts a minimal valid payload", () => {
  const { error } = projectCreate.validate({
    workspaceId: "507f1f77bcf86cd799439011",
    name: "MVP Launch",
  });
  assert.equal(error, undefined);
});

test("projectCreate rejects a missing workspaceId", () => {
  const { error } = projectCreate.validate({ name: "MVP Launch" });
  assert.ok(error);
  assert.match(error.message, /workspaceId/);
});

test("projectCreate rejects a name shorter than 2 chars", () => {
  const { error } = projectCreate.validate({
    workspaceId: "507f1f77bcf86cd799439011",
    name: "A",
  });
  assert.ok(error);
});

test("projectCreate rejects an invalid status value", () => {
  const { error } = projectCreate.validate({
    workspaceId: "507f1f77bcf86cd799439011",
    name: "MVP Launch",
    status: "done",
  });
  assert.ok(error);
});

test("projectCreate accepts a valid status value", () => {
  const { error } = projectCreate.validate({
    workspaceId: "507f1f77bcf86cd799439011",
    name: "MVP Launch",
    status: "active",
  });
  assert.equal(error, undefined);
});

test("projectUpdate allows a partial payload with no required fields", () => {
  const { error } = projectUpdate.validate({ description: "Updated scope" });
  assert.equal(error, undefined);
});

test("projectUpdate rejects an invalid status value", () => {
  const { error } = projectUpdate.validate({ status: "finished" });
  assert.ok(error);
});
