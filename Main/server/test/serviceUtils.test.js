const { test } = require("node:test");
const assert = require("node:assert/strict");
const ApiError = require("../src/utils/ApiError");
const { assertOwner } = require("../src/services/serviceUtils");

test("assertOwner passes when ids match (string vs ObjectId-like)", () => {
  assert.doesNotThrow(() => assertOwner("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439011", "denied"));
});

test("assertOwner throws plain Error with message when ids mismatch and no statusCode given", () => {
  assert.throws(
    () => assertOwner("owner-a", "owner-b", "You are not authorized."),
    (err) => err instanceof Error && !(err instanceof ApiError) && err.message === "You are not authorized."
  );
});

test("assertOwner throws ApiError with given statusCode when ids mismatch", () => {
  assert.throws(
    () => assertOwner("owner-a", "owner-b", "You are not authorized to update this startup.", 403),
    (err) => err instanceof ApiError && err.statusCode === 403 && err.message === "You are not authorized to update this startup."
  );
});

test("assertOwner compares via String() so ObjectId-like objects with matching toString() pass", () => {
  const ownerId = { toString: () => "507f1f77bcf86cd799439011" };
  assert.doesNotThrow(() => assertOwner(ownerId, "507f1f77bcf86cd799439011", "denied"));
});
