// applyQueryOptions pagination-bound tests (Phase 17 final audit
// regression). The helper previously applied no limit at all when the
// caller passed none, and honoured any caller-supplied limit verbatim -
// an unbounded query and unbounded response payload on user-controlled
// input, across the ~23 services that use it.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  applyQueryOptions,
  clampQueryLimit,
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_LIMIT,
} = require("../src/services/serviceUtils");
const queryUtils = require("../src/services/queryUtils");

// Minimal stand-in for a Mongoose Query - records what was applied.
function fakeQuery() {
  return {
    applied: {},
    sort(value) {
      this.applied.sort = value;
      return this;
    },
    limit(value) {
      this.applied.limit = value;
      return this;
    },
    skip(value) {
      this.applied.skip = value;
      return this;
    },
  };
}

test("clampQueryLimit falls back to the default for a missing or invalid limit", () => {
  assert.equal(clampQueryLimit(undefined), DEFAULT_QUERY_LIMIT);
  assert.equal(clampQueryLimit(null), DEFAULT_QUERY_LIMIT);
  assert.equal(clampQueryLimit("not-a-number"), DEFAULT_QUERY_LIMIT);
  assert.equal(clampQueryLimit(0), DEFAULT_QUERY_LIMIT);
  assert.equal(clampQueryLimit(-5), DEFAULT_QUERY_LIMIT);
});

test("clampQueryLimit caps an oversized caller-supplied limit", () => {
  assert.equal(clampQueryLimit(1000000), MAX_QUERY_LIMIT);
  assert.equal(clampQueryLimit(MAX_QUERY_LIMIT + 1), MAX_QUERY_LIMIT);
  assert.equal(clampQueryLimit("999999"), MAX_QUERY_LIMIT);
});

test("clampQueryLimit honours a reasonable explicit limit", () => {
  assert.equal(clampQueryLimit(5), 5);
  assert.equal(clampQueryLimit("25"), 25);
  assert.equal(clampQueryLimit(7.9), 7);
});

test("applyQueryOptions always applies a limit, even when none is requested", () => {
  const query = fakeQuery();
  applyQueryOptions(query, {});
  assert.equal(query.applied.limit, DEFAULT_QUERY_LIMIT, "an unbounded query must never reach the database");
});

test("applyQueryOptions caps a user-supplied limit", () => {
  const query = fakeQuery();
  applyQueryOptions(query, { limit: 5000 });
  assert.equal(query.applied.limit, MAX_QUERY_LIMIT);
});

test("applyQueryOptions ignores a negative or non-numeric skip", () => {
  const negative = fakeQuery();
  applyQueryOptions(negative, { skip: -10 });
  assert.equal(negative.applied.skip, undefined);

  const bogus = fakeQuery();
  applyQueryOptions(bogus, { skip: "abc" });
  assert.equal(bogus.applied.skip, undefined);
});

test("applyQueryOptions passes through sort and a valid skip", () => {
  const query = fakeQuery();
  applyQueryOptions(query, { sort: { createdAt: -1 }, skip: 20, limit: 10 });
  assert.deepEqual(query.applied.sort, { createdAt: -1 });
  assert.equal(query.applied.skip, 20);
  assert.equal(query.applied.limit, 10);
});

test("queryUtils re-exports the same single implementation (no duplicate drift)", () => {
  assert.equal(queryUtils.applyQueryOptions, applyQueryOptions);
  const query = fakeQuery();
  queryUtils.applyQueryOptions(query, {});
  assert.equal(query.applied.limit, DEFAULT_QUERY_LIMIT);
});
