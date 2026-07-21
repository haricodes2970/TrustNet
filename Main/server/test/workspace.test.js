const { test } = require("node:test");
const assert = require("node:assert/strict");
const { workspaceCreate, workspaceUpdate } = require("../src/validators/workspace.validators");

test("workspaceCreate accepts a minimal valid payload", () => {
  const { error } = workspaceCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    name: "Acme Workspace",
  });
  assert.equal(error, undefined);
});

test("workspaceCreate rejects a missing startupId", () => {
  const { error } = workspaceCreate.validate({ name: "Acme Workspace" });
  assert.ok(error);
  assert.match(error.message, /startupId/);
});

test("workspaceCreate rejects a name shorter than 2 chars", () => {
  const { error } = workspaceCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    name: "A",
  });
  assert.ok(error);
});

test("workspaceCreate rejects an invalid settings.defaultVisibility value", () => {
  const { error } = workspaceCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    name: "Acme Workspace",
    settings: { defaultVisibility: "public" },
  });
  assert.ok(error);
});

test("workspaceCreate accepts a valid settings.defaultVisibility value", () => {
  const { error } = workspaceCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    name: "Acme Workspace",
    settings: { defaultVisibility: "private" },
  });
  assert.equal(error, undefined);
});

test("workspaceUpdate allows a partial payload with no required fields", () => {
  const { error } = workspaceUpdate.validate({ description: "Updated description" });
  assert.equal(error, undefined);
});

test("workspaceUpdate rejects an invalid settings.defaultVisibility value", () => {
  const { error } = workspaceUpdate.validate({ settings: { defaultVisibility: "everyone" } });
  assert.ok(error);
});
