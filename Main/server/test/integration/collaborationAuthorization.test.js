// Collaboration module authorization tests (Phase 17 final audit
// regression). This router was mounted at /api/v1/collaborations with NO
// authentication middleware at all: every route was reachable
// unauthenticated, exposing every collaboration request on the platform
// (including private message bodies) for read, forge, modify, and delete.
// These tests lock that closed.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const CollaborationRequest = require("../../src/models/CollaborationRequest");

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

const MESSAGE = "This is a private confidential collaboration message between two users.";

async function seedRequest(senderId, recipientId, overrides = {}) {
  return CollaborationRequest.create({
    sender: senderId,
    recipient: recipientId,
    type: "funding",
    subject: "Private deal",
    message: MESSAGE,
    ...overrides,
  });
}

// --- Authentication (the actual Phase 17 blocker) ---

test("every collaboration route rejects an unauthenticated caller", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();
  const request = await seedRequest(a.user._id, b.user._id);

  const calls = [
    await api("/api/v1/collaborations"),
    await api(`/api/v1/collaborations/${request._id}`),
    await api("/api/v1/collaborations/request", { method: "POST", body: { recipient: String(a.user._id), message: MESSAGE } }),
    await api(`/api/v1/collaborations/${request._id}`, { method: "PUT", body: { status: "accepted" } }),
    await api(`/api/v1/collaborations/${request._id}`, { method: "DELETE" }),
  ];

  for (const call of calls) {
    assert.equal(call.status, 401, `expected 401, got ${call.status}: ${JSON.stringify(call.json)}`);
  }

  // Nothing was mutated or deleted by the unauthenticated attempts.
  const persisted = await CollaborationRequest.findById(request._id);
  assert.ok(persisted, "the request must not have been deleted");
  assert.equal(persisted.status, "pending");
});

// --- Sender forging / mass assignment ---

test("sender is always the authenticated user - a forged sender in the body is ignored", async () => {
  const attacker = await createAuthenticatedTestUser();
  const victim = await createAuthenticatedTestUser();
  const target = await createAuthenticatedTestUser();

  const { status, json } = await api("/api/v1/collaborations/request", {
    method: "POST",
    token: attacker.token,
    body: { sender: String(victim.user._id), recipient: String(target.user._id), message: MESSAGE },
  });
  assert.equal(status, 201);
  assert.equal(String(json.data.sender), String(attacker.user._id), "sender must be the caller, not the forged body value");
});

test("status cannot be forced to accepted at creation time", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();

  const { status, json } = await api("/api/v1/collaborations/request", {
    method: "POST",
    token: a.token,
    body: { recipient: String(b.user._id), message: MESSAGE, status: "accepted" },
  });
  assert.equal(status, 201);
  assert.equal(json.data.status, "pending");
});

test("cannot send a collaboration request to yourself", async () => {
  const a = await createAuthenticatedTestUser();
  const { status } = await api("/api/v1/collaborations/request", {
    method: "POST",
    token: a.token,
    body: { recipient: String(a.user._id), message: MESSAGE },
  });
  assert.equal(status, 400);
});

test("cannot send a collaboration request to a suspended or non-existent recipient", async () => {
  const a = await createAuthenticatedTestUser();
  const suspended = await createAuthenticatedTestUser({ isActive: false });

  const toSuspended = await api("/api/v1/collaborations/request", {
    method: "POST",
    token: a.token,
    body: { recipient: String(suspended.user._id), message: MESSAGE },
  });
  assert.equal(toSuspended.status, 404);

  const toMissing = await api("/api/v1/collaborations/request", {
    method: "POST",
    token: a.token,
    body: { recipient: "6a0000000000000000000000", message: MESSAGE },
  });
  assert.equal(toMissing.status, 404);
});

// --- IDOR: third-party access ---

test("an unrelated user cannot read, update, or delete someone else's collaboration request", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  const request = await seedRequest(a.user._id, b.user._id);

  const read = await api(`/api/v1/collaborations/${request._id}`, { token: outsider.token });
  assert.equal(read.status, 403);

  const update = await api(`/api/v1/collaborations/${request._id}`, {
    method: "PUT",
    token: outsider.token,
    body: { status: "accepted" },
  });
  assert.equal(update.status, 403);

  const del = await api(`/api/v1/collaborations/${request._id}`, { method: "DELETE", token: outsider.token });
  assert.equal(del.status, 403);

  const persisted = await CollaborationRequest.findById(request._id);
  assert.equal(persisted.status, "pending");
});

test("listing is scoped to the caller - it never returns other users' requests", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  await seedRequest(a.user._id, b.user._id);

  const outsiderList = await api("/api/v1/collaborations", { token: outsider.token });
  assert.equal(outsiderList.status, 200);
  assert.equal(outsiderList.json.data.length, 0, "an uninvolved user must see no requests");

  const senderList = await api("/api/v1/collaborations", { token: a.token });
  assert.equal(senderList.json.data.length, 1);

  const recipientList = await api("/api/v1/collaborations", { token: b.token });
  assert.equal(recipientList.json.data.length, 1);
});

test("a caller-supplied Mongo filter cannot widen the listing scope", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  await seedRequest(a.user._id, b.user._id);

  const { json } = await api('/api/v1/collaborations?filter={}&limit=1000', { token: outsider.token });
  assert.equal(json.data.length, 0, "an arbitrary filter query param must not bypass caller scoping");
});

// --- Transition authorization ---

test("only the recipient can accept or reject; only the sender can withdraw", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();

  const first = await seedRequest(a.user._id, b.user._id);
  const senderAccept = await api(`/api/v1/collaborations/${first._id}`, {
    method: "PUT",
    token: a.token,
    body: { status: "accepted" },
  });
  assert.equal(senderAccept.status, 403, "the sender must not be able to accept their own request");

  const recipientAccept = await api(`/api/v1/collaborations/${first._id}`, {
    method: "PUT",
    token: b.token,
    body: { status: "accepted" },
  });
  assert.equal(recipientAccept.status, 200);
  assert.equal(recipientAccept.json.data.status, "accepted");

  const second = await seedRequest(a.user._id, b.user._id);
  const recipientWithdraw = await api(`/api/v1/collaborations/${second._id}`, {
    method: "PUT",
    token: b.token,
    body: { status: "withdrawn" },
  });
  assert.equal(recipientWithdraw.status, 403, "the recipient must not be able to withdraw the sender's request");

  const senderWithdraw = await api(`/api/v1/collaborations/${second._id}`, {
    method: "PUT",
    token: a.token,
    body: { status: "withdrawn" },
  });
  assert.equal(senderWithdraw.status, 200);
});

test("a request that is no longer pending cannot be responded to again", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();
  const request = await seedRequest(a.user._id, b.user._id);

  await api(`/api/v1/collaborations/${request._id}`, { method: "PUT", token: b.token, body: { status: "accepted" } });
  const second = await api(`/api/v1/collaborations/${request._id}`, {
    method: "PUT",
    token: b.token,
    body: { status: "rejected" },
  });
  assert.equal(second.status, 409);
});

test("only the sender can delete a request", async () => {
  const a = await createAuthenticatedTestUser();
  const b = await createAuthenticatedTestUser();
  const request = await seedRequest(a.user._id, b.user._id);

  const recipientDelete = await api(`/api/v1/collaborations/${request._id}`, { method: "DELETE", token: b.token });
  assert.equal(recipientDelete.status, 403);

  const senderDelete = await api(`/api/v1/collaborations/${request._id}`, { method: "DELETE", token: a.token });
  assert.equal(senderDelete.status, 200);
  assert.equal(await CollaborationRequest.findById(request._id), null);
});

test("a malformed collaboration id returns a clean 400, not a raw CastError", async () => {
  const a = await createAuthenticatedTestUser();
  const { status, json } = await api("/api/v1/collaborations/not-a-valid-id", { token: a.token });
  assert.equal(status, 400);
  assert.doesNotMatch(json.message, /Cast to ObjectId/i);
});
