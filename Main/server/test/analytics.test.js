const { test } = require("node:test");
const assert = require("node:assert/strict");
const { defaultCounts, assertAnyRole } = require("../src/services/analyticsService");
const ApiError = require("../src/utils/ApiError");

test("defaultCounts fills every known status with 0 when the group result is empty", () => {
  const counts = defaultCounts(["draft", "published", "closed"], []);
  assert.deepEqual(counts, { draft: 0, published: 0, closed: 0 });
});

test("defaultCounts applies group counts onto the known statuses", () => {
  const counts = defaultCounts(
    ["draft", "published", "closed"],
    [{ _id: "published", count: 3 }, { _id: "draft", count: 1 }]
  );
  assert.deepEqual(counts, { draft: 1, published: 3, closed: 0 });
});

test("defaultCounts ignores a group result entry outside the known statuses", () => {
  const counts = defaultCounts(["draft", "published"], [{ _id: "unexpected", count: 5 }]);
  assert.deepEqual(counts, { draft: 0, published: 0 });
});

test("assertAnyRole throws ApiError 400 when startupId is missing", async () => {
  await assert.rejects(
    () => assertAnyRole(undefined, "507f1f77bcf86cd799439011"),
    (error) => error instanceof ApiError && error.statusCode === 400
  );
});
