// HTTP error-contract tests (Phase 17 final audit regression). Raw
// Mongoose errors were reaching API consumers verbatim - a malformed :id
// produced `Cast to ObjectId failed for value "abc" (type string) at path
// "_id" for model "Project"`, leaking internal model names and query
// internals, with an inconsistent status code per module (404/500/403 for
// the same class of input). Normalized centrally in
// serviceUtils.handleServiceError + the errorHandler middleware.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");

let server;
let baseUrl;

before(async () => {
  await setupTestDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

async function api(pathName, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

// Every module that resolves a resource by a path :id. A malformed id is a
// client error (400), never a 500, and must never echo Mongoose internals.
const ID_ROUTES = [
  "/api/v1/startups/not-an-id",
  "/api/v1/projects/not-an-id",
  "/api/v1/tasks/not-an-id",
  "/api/v1/posts/not-an-id",
  "/api/v1/communities/not-an-id",
  "/api/v1/documents/not-an-id",
  "/api/v1/jobs/not-an-id",
  "/api/v1/workspaces/not-an-id",
  "/api/v1/milestones/not-an-id",
  "/api/v1/funding-rounds/not-an-id",
  "/api/v1/investment-interests/not-an-id",
  "/api/v1/service-listings/not-an-id",
  "/api/v1/applications/not-an-id",
  "/api/v1/teams/not-an-id",
  "/api/v1/collaborations/not-an-id",
];

const LEAK_PATTERN = /Cast to ObjectId|BSONError|MongoServerError|MongoError|ValidationError:|at path "_id"|for model "/i;

test("a malformed resource id never leaks a raw Mongoose error on any module", async () => {
  const user = await createAuthenticatedTestUser();

  for (const route of ID_ROUTES) {
    // eslint-disable-next-line no-await-in-loop
    const { status, json } = await api(route, { token: user.token });
    const message = (json && json.message) || "";

    assert.doesNotMatch(message, LEAK_PATTERN, `${route} leaked a raw Mongoose error: ${message}`);
    assert.ok(status < 500, `${route} returned ${status} for a malformed id - a bad id is a client error, not a server error`);
    assert.equal(json.success, false, `${route} must use the standard error envelope`);
  }
});

test("a malformed resource id resolves to 400 wherever the id itself is what failed to parse", async () => {
  const user = await createAuthenticatedTestUser();
  // Modules that explicitly pre-validate the id (startups, jobs) answer 404
  // "not found" instead, which is an equally valid, non-leaking contract -
  // this asserts the majority path without forcing those two to change.
  const { status, json } = await api("/api/v1/projects/not-an-id", { token: user.token });
  assert.equal(status, 400);
  assert.match(json.message, /invalid id/i);
});

test("no API error response ever includes a stack trace outside development", async () => {
  const user = await createAuthenticatedTestUser();
  const { json } = await api("/api/v1/projects/not-an-id", { token: user.token });
  assert.equal(json.stack, undefined);
});

test("a well-formed but non-existent id returns 404, not 400 or 500", async () => {
  const user = await createAuthenticatedTestUser();
  const missing = "6a0000000000000000000000";
  const { status, json } = await api(`/api/v1/projects/${missing}`, { token: user.token });
  assert.equal(status, 404);
  assert.doesNotMatch(json.message || "", LEAK_PATTERN);
});

test("an unknown route returns the standard 404 envelope, not an HTML error page", async () => {
  const { status, json } = await api("/api/v1/definitely-not-a-real-route");
  assert.equal(status, 404);
  assert.equal(json.success, false);
});
