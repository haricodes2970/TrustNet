const { test } = require("node:test");
const assert = require("node:assert/strict");
const { documentCreate, documentUpdate } = require("../src/validators/document.validators");
const { canMutateDocument } = require("../src/services/documentService");

test("documentCreate accepts a minimal valid payload", () => {
  const { error } = documentCreate.validate({
    projectId: "507f1f77bcf86cd799439011",
    title: "Pitch Deck v1",
  });
  assert.equal(error, undefined);
});

test("documentCreate rejects a missing projectId", () => {
  const { error } = documentCreate.validate({ title: "Pitch Deck v1" });
  assert.ok(error);
  assert.match(error.message, /projectId/);
});

test("documentCreate rejects a title shorter than 2 chars", () => {
  const { error } = documentCreate.validate({
    projectId: "507f1f77bcf86cd799439011",
    title: "P",
  });
  assert.ok(error);
});

test("documentUpdate allows a partial payload with no required fields", () => {
  const { error } = documentUpdate.validate({ description: "Updated notes" });
  assert.equal(error, undefined);
});

test("documentUpdate does not declare storage/file fields (schema-level immutability signal)", () => {
  const keys = Object.keys(documentUpdate.describe().keys);
  assert.deepEqual(keys.sort(), ["description", "title"]);
});

test("canMutateDocument: owner can mutate any document", () => {
  const doc = { createdBy: "user-a" };
  assert.equal(canMutateDocument(doc, "user-z", "owner"), true);
});

test("canMutateDocument: admin can mutate any document", () => {
  const doc = { createdBy: "user-a" };
  assert.equal(canMutateDocument(doc, "user-z", "admin"), true);
});

test("canMutateDocument: contributor can mutate a document they uploaded", () => {
  const doc = { createdBy: "user-x" };
  assert.equal(canMutateDocument(doc, "user-x", "contributor"), true);
});

test("canMutateDocument: contributor cannot mutate someone else's document", () => {
  const doc = { createdBy: "user-a" };
  assert.equal(canMutateDocument(doc, "user-x", "contributor"), false);
});

test("canMutateDocument: no resolvable workspace role denies mutation", () => {
  const doc = { createdBy: "user-x" };
  assert.equal(canMutateDocument(doc, "user-x", null), false);
});

test("canMutateDocument has no assignedTo concept — an assignedTo-shaped field on the object is ignored", () => {
  const doc = { createdBy: "user-a", assignedTo: "user-x" };
  // Unlike canMutateTask, a contributor who merely happens to have an
  // `assignedTo`-shaped field pointing at them does NOT gain mutation
  // rights on a Document — only createdBy matters here.
  assert.equal(canMutateDocument(doc, "user-x", "contributor"), false);
});
