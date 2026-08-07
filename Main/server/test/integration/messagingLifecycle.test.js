// Messaging (Conversation + Message) + Notifications integration tests
// (Messaging + Notifications hardening phase). Runs the real Express app
// over HTTP against an in-memory MongoDB instance. This module had zero
// test coverage before this phase.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const User = require("../../src/models/User");

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

async function makeAdmin() {
  return createAuthenticatedTestUser({ role: "admin" });
}

async function createDirectConversation(a, b) {
  return api("/api/v1/messages/conversations", {
    method: "POST",
    token: a.token,
    body: { participants: [String(b.user._id)], type: "direct" },
  });
}

// --- Conversation ---

test("create: reuses an existing direct conversation between the same two participants", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();

  const first = await createDirectConversation(alice, bob);
  assert.equal(first.status, 201);

  const second = await createDirectConversation(alice, bob);
  assert.equal(second.status, 201);
  assert.equal(second.json.data._id, first.json.data._id);
});

test("create rejects a deleted or suspended participant", async () => {
  const alice = await createAuthenticatedTestUser();
  const suspended = await createAuthenticatedTestUser();
  await User.findByIdAndUpdate(suspended.user._id, { isActive: false });

  const { status } = await createDirectConversation(alice, suspended);
  assert.equal(status, 409);

  const missing = await api("/api/v1/messages/conversations", {
    method: "POST",
    token: alice.token,
    body: { participants: ["507f1f77bcf86cd799439011"], type: "direct" },
  });
  assert.equal(missing.status, 404);
});

test("get: participant can view, non-participant is rejected, platform admin can view", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;

  const byParticipant = await api(`/api/v1/messages/conversations/${id}`, { token: bob.token });
  assert.equal(byParticipant.status, 200);

  const byOutsider = await api(`/api/v1/messages/conversations/${id}`, { token: outsider.token });
  assert.equal(byOutsider.status, 403);

  const byAdmin = await api(`/api/v1/messages/conversations/${id}`, { token: admin.token });
  assert.equal(byAdmin.status, 200);
});

test("list only returns the caller's own conversations", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  await createDirectConversation(alice, bob);

  const list = await api("/api/v1/messages/conversations", { token: outsider.token });
  assert.equal(list.status, 200);
  assert.equal(list.json.data.length, 0);

  const aliceList = await api("/api/v1/messages/conversations", { token: alice.token });
  assert.equal(aliceList.json.data.length, 1);
});

test("delete is soft (restorable) and excluded from the list afterward; sending is blocked while deleted", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;

  const deleted = await api(`/api/v1/messages/conversations/${id}`, { method: "DELETE", token: alice.token });
  assert.equal(deleted.status, 200);

  const list = await api("/api/v1/messages/conversations", { token: alice.token });
  assert.equal(list.json.data.length, 0);

  const blockedSend = await api(`/api/v1/messages/conversations/${id}/messages`, {
    method: "POST",
    token: bob.token,
    body: { content: "Hello?" },
  });
  assert.equal(blockedSend.status, 409);

  const restored = await api(`/api/v1/messages/conversations/${id}/restore`, { method: "POST", token: bob.token });
  assert.equal(restored.status, 200);

  const listAfter = await api("/api/v1/messages/conversations", { token: alice.token });
  assert.equal(listAfter.json.data.length, 1);
});

// --- Message ---

test("send: non-participant is rejected 403; message triggers a notification for the recipient", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;

  const byOutsider = await api(`/api/v1/messages/conversations/${id}/messages`, {
    method: "POST",
    token: outsider.token,
    body: { content: "Sneaking in" },
  });
  assert.equal(byOutsider.status, 403);

  const sent = await api(`/api/v1/messages/conversations/${id}/messages`, {
    method: "POST",
    token: alice.token,
    body: { content: "Hey Bob!" },
  });
  assert.equal(sent.status, 201);

  const bobNotifications = await api("/api/v1/notifications?type=message", { token: bob.token });
  assert.equal(bobNotifications.json.data.length, 1);
});

test("edit: owner only, blocked once deleted, isEdited/editedAt set", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;
  const sent = await api(`/api/v1/messages/conversations/${id}/messages`, {
    method: "POST",
    token: alice.token,
    body: { content: "Original" },
  });
  const messageId = sent.json.data._id;

  const byOther = await api(`/api/v1/messages/conversations/${id}/messages/${messageId}`, {
    method: "PUT",
    token: bob.token,
    body: { content: "Hijacked" },
  });
  assert.equal(byOther.status, 403);

  const edited = await api(`/api/v1/messages/conversations/${id}/messages/${messageId}`, {
    method: "PUT",
    token: alice.token,
    body: { content: "Edited" },
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.json.data.isEdited, true);
  assert.ok(edited.json.data.editedAt);

  await api(`/api/v1/messages/conversations/${id}/messages/${messageId}`, { method: "DELETE", token: alice.token });
  const editAfterDelete = await api(`/api/v1/messages/conversations/${id}/messages/${messageId}`, {
    method: "PUT",
    token: alice.token,
    body: { content: "Too late" },
  });
  assert.equal(editAfterDelete.status, 409);
});

test("delete is soft (restorable), sender-only unless platform admin, and keeps the conversation preview in sync", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;

  const first = await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "First" } });
  const second = await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "Second" } });

  const deleteByOther = await api(`/api/v1/messages/conversations/${id}/messages/${second.json.data._id}`, { method: "DELETE", token: bob.token });
  assert.equal(deleteByOther.status, 403);

  const deleted = await api(`/api/v1/messages/conversations/${id}/messages/${second.json.data._id}`, { method: "DELETE", token: alice.token });
  assert.equal(deleted.status, 200);

  const afterDelete = await api(`/api/v1/messages/conversations/${id}`, { token: alice.token });
  assert.equal(afterDelete.json.data.lastMessage.content, "First");

  const restored = await api(`/api/v1/messages/conversations/${id}/messages/${second.json.data._id}/restore`, { method: "POST", token: alice.token });
  assert.equal(restored.status, 200);

  const afterRestore = await api(`/api/v1/messages/conversations/${id}`, { token: alice.token });
  assert.equal(afterRestore.json.data.lastMessage.content, "Second");

  const adminDelete = await api(`/api/v1/messages/conversations/${id}/messages/${first.json.data._id}`, { method: "DELETE", token: admin.token });
  assert.equal(adminDelete.status, 200);
});

test("markMessageRead: non-participant rejected, status progresses sent -> delivered -> read across a group, idempotent re-read", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const carol = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();

  const group = await api("/api/v1/messages/conversations", {
    method: "POST",
    token: alice.token,
    body: { participants: [String(bob.user._id), String(carol.user._id)], type: "group", title: "Squad" },
  });
  const convId = group.json.data._id;
  const sent = await api(`/api/v1/messages/conversations/${convId}/messages`, { method: "POST", token: alice.token, body: { content: "Hi all" } });
  const messageId = sent.json.data._id;
  assert.equal(sent.json.data.status, "sent");

  const byOutsider = await api(`/api/v1/messages/conversations/${convId}/messages/${messageId}/read`, { method: "PUT", token: outsider.token });
  assert.equal(byOutsider.status, 403);

  const afterBob = await api(`/api/v1/messages/conversations/${convId}/messages/${messageId}/read`, { method: "PUT", token: bob.token });
  assert.equal(afterBob.status, 200);
  assert.equal(afterBob.json.data.status, "delivered");

  const afterBobAgain = await api(`/api/v1/messages/conversations/${convId}/messages/${messageId}/read`, { method: "PUT", token: bob.token });
  assert.equal(afterBobAgain.status, 200);
  assert.equal(afterBobAgain.json.data.status, "delivered");

  const afterCarol = await api(`/api/v1/messages/conversations/${convId}/messages/${messageId}/read`, { method: "PUT", token: carol.token });
  assert.equal(afterCarol.status, 200);
  assert.equal(afterCarol.json.data.status, "read");
});

test("unread count reflects unread messages accurately, excluding a deleted conversation", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;

  await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "One" } });
  await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "Two" } });

  const before = await api("/api/v1/messages/unread-count", { token: bob.token });
  assert.equal(before.json.data.unreadCount, 2);

  await api(`/api/v1/messages/conversations/${id}`, { method: "DELETE", token: alice.token });
  const afterDelete = await api("/api/v1/messages/unread-count", { token: bob.token });
  assert.equal(afterDelete.json.data.unreadCount, 0);
});

test("search: listMessages filters by content, listConversations filters by title", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const conv = await api("/api/v1/messages/conversations", {
    method: "POST",
    token: alice.token,
    body: { participants: [String(bob.user._id)], type: "group", title: "Project Falcon" },
  });
  const id = conv.json.data._id;
  await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "The eagle has landed" } });
  await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "Unrelated chatter" } });

  const messageSearch = await api(`/api/v1/messages/conversations/${id}/messages?search=eagle`, { token: alice.token });
  assert.equal(messageSearch.json.data.length, 1);

  const conversationSearch = await api("/api/v1/messages/conversations?search=falcon", { token: alice.token });
  assert.equal(conversationSearch.json.data.length, 1);
});

// --- Notifications ---

test("list supports read/type filtering, ownership is enforced on mark-read/delete", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;
  await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "Ping" } });

  const unread = await api("/api/v1/notifications?read=false", { token: bob.token });
  assert.equal(unread.json.data.length, 1);
  const notificationId = unread.json.data[0]._id;

  const byOtherUser = await api(`/api/v1/notifications/${notificationId}/read`, { method: "PUT", token: alice.token });
  assert.equal(byOtherUser.status, 404);

  const markedRead = await api(`/api/v1/notifications/${notificationId}/read`, { method: "PUT", token: bob.token });
  assert.equal(markedRead.status, 200);

  const readFilter = await api("/api/v1/notifications?read=true", { token: bob.token });
  assert.equal(readFilter.json.data.length, 1);

  const deleteByOtherUser = await api(`/api/v1/notifications/${notificationId}`, { method: "DELETE", token: alice.token });
  assert.equal(deleteByOtherUser.status, 404);

  const deleted = await api(`/api/v1/notifications/${notificationId}`, { method: "DELETE", token: bob.token });
  assert.equal(deleted.status, 200);
});

test("markAllRead clears the unread count", async () => {
  const alice = await createAuthenticatedTestUser();
  const bob = await createAuthenticatedTestUser();
  const conv = await createDirectConversation(alice, bob);
  const id = conv.json.data._id;
  await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "One" } });
  await api(`/api/v1/messages/conversations/${id}/messages`, { method: "POST", token: alice.token, body: { content: "Two" } });

  const before = await api("/api/v1/notifications/unread-count", { token: bob.token });
  assert.equal(before.json.data.unreadCount, 2);

  await api("/api/v1/notifications/read-all", { method: "PUT", token: bob.token });

  const after = await api("/api/v1/notifications/unread-count", { token: bob.token });
  assert.equal(after.json.data.unreadCount, 0);
});
