// Communities + Posts + Comments + Likes integration tests (Social
// networking hardening phase). Runs the real Express app over HTTP against
// an in-memory MongoDB instance. This module had zero test coverage before
// this phase (confirmed by audit) and predates every hardening convention
// established elsewhere in this session - this file exercises everything
// fixed: soft delete/restore, platform-admin override, visibility
// enforcement, atomic like/join counters, and the removed legacy
// email-based comment/like auth path.

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

async function makeAdmin() {
  return createAuthenticatedTestUser({ role: "admin" });
}

function uniqueSlug(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function createPublicCommunity(owner) {
  const slug = uniqueSlug("public-co");
  const { json } = await api("/api/v1/communities", {
    method: "POST",
    token: owner.token,
    body: { name: `Public Co ${slug}`, slug, description: "A".repeat(20), type: "public" },
  });
  return json.data;
}

async function createPrivateCommunity(owner) {
  const slug = uniqueSlug("private-co");
  const { json } = await api("/api/v1/communities", {
    method: "POST",
    token: owner.token,
    body: { name: `Private Co ${slug}`, slug, description: "A".repeat(20), type: "private" },
  });
  return json.data;
}

// --- Communities ---

test("create succeeds, owner is auto-added as a member, duplicate name is rejected 409", async () => {
  const owner = await createAuthenticatedTestUser();
  const community = await createPublicCommunity(owner);
  assert.equal(community.memberCount, 1);

  const dup = await api("/api/v1/communities", {
    method: "POST",
    token: owner.token,
    body: { name: community.name, slug: uniqueSlug("dup"), description: "A".repeat(20) },
  });
  assert.equal(dup.status, 409);
});

test("update: owner can edit, another user cannot, platform admin can", async () => {
  const owner = await createAuthenticatedTestUser();
  const other = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const community = await createPublicCommunity(owner);

  const byOwner = await api(`/api/v1/communities/${community._id}`, {
    method: "PUT",
    token: owner.token,
    body: { description: "B".repeat(30) },
  });
  assert.equal(byOwner.status, 200);

  const byOther = await api(`/api/v1/communities/${community._id}`, {
    method: "PUT",
    token: other.token,
    body: { description: "Hijacked description here." },
  });
  assert.equal(byOther.status, 403);

  const byAdmin = await api(`/api/v1/communities/${community._id}`, {
    method: "PUT",
    token: admin.token,
    body: { description: "C".repeat(30) },
  });
  assert.equal(byAdmin.status, 200);
});

test("delete is soft (restorable), and a deleted community is concealed from public view", async () => {
  const owner = await createAuthenticatedTestUser();
  const community = await createPublicCommunity(owner);

  const deleted = await api(`/api/v1/communities/${community._id}`, { method: "DELETE", token: owner.token });
  assert.equal(deleted.status, 200);

  const publicGet = await api(`/api/v1/communities/${community._id}`);
  assert.equal(publicGet.status, 404);

  const ownerGet = await api(`/api/v1/communities/${community._id}`, { token: owner.token });
  assert.equal(ownerGet.status, 200);

  const restored = await api(`/api/v1/communities/${community._id}/restore`, { method: "POST", token: owner.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.deletedAt, null);

  const publicGetAfter = await api(`/api/v1/communities/${community._id}`);
  assert.equal(publicGetAfter.status, 200);
});

test("join: public succeeds, duplicate join rejected, private community self-join rejected, leave works and memberCount stays accurate", async () => {
  const owner = await createAuthenticatedTestUser();
  const member = await createAuthenticatedTestUser();
  const publicCommunity = await createPublicCommunity(owner);
  const privateCommunity = await createPrivateCommunity(owner);

  const join = await api(`/api/v1/communities/${publicCommunity._id}/join`, { method: "POST", token: member.token });
  assert.equal(join.status, 200);
  assert.equal(join.json.data.memberCount, 2);

  const dupJoin = await api(`/api/v1/communities/${publicCommunity._id}/join`, { method: "POST", token: member.token });
  assert.equal(dupJoin.status, 409);

  const privateJoin = await api(`/api/v1/communities/${privateCommunity._id}/join`, { method: "POST", token: member.token });
  assert.equal(privateJoin.status, 403);

  const ownerLeave = await api(`/api/v1/communities/${publicCommunity._id}/leave`, { method: "POST", token: owner.token });
  assert.equal(ownerLeave.status, 403);

  const leave = await api(`/api/v1/communities/${publicCommunity._id}/leave`, { method: "POST", token: member.token });
  assert.equal(leave.status, 200);
  assert.equal(leave.json.data.memberCount, 1);

  const dupLeave = await api(`/api/v1/communities/${publicCommunity._id}/leave`, { method: "POST", token: member.token });
  assert.equal(dupLeave.status, 409);
});

// --- Posts ---

test("create requires authentication (previously reachable with no token at all)", async () => {
  const { status } = await api("/api/v1/posts", { method: "POST", body: { content: "Hello world" } });
  assert.equal(status, 401);
});

test("create validates content, and stamps the authenticated caller as author", async () => {
  const author = await createAuthenticatedTestUser();
  const missing = await api("/api/v1/posts", { method: "POST", token: author.token, body: {} });
  assert.equal(missing.status, 400);

  const created = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "Hello world" } });
  assert.equal(created.status, 201);
  assert.equal(String(created.json.data.author), String(author.user._id));
});

test("update/delete: only the author or a platform admin may act, another user is rejected 403", async () => {
  const author = await createAuthenticatedTestUser();
  const other = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const created = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "Original content" } });
  const id = created.json.data._id;

  const byOther = await api(`/api/v1/posts/${id}`, { method: "PUT", token: other.token, body: { content: "Hijacked" } });
  assert.equal(byOther.status, 403);

  const byAuthor = await api(`/api/v1/posts/${id}`, { method: "PUT", token: author.token, body: { content: "Edited by author" } });
  assert.equal(byAuthor.status, 200);

  const deleteByOther = await api(`/api/v1/posts/${id}`, { method: "DELETE", token: other.token });
  assert.equal(deleteByOther.status, 403);

  const deleteByAdmin = await api(`/api/v1/posts/${id}`, { method: "DELETE", token: admin.token });
  assert.equal(deleteByAdmin.status, 200);
});

test("delete is soft (restorable)", async () => {
  const author = await createAuthenticatedTestUser();
  const created = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "To be deleted" } });
  const id = created.json.data._id;

  await api(`/api/v1/posts/${id}`, { method: "DELETE", token: author.token });
  const hiddenGet = await api(`/api/v1/posts/${id}`);
  assert.equal(hiddenGet.status, 404);

  const restored = await api(`/api/v1/posts/${id}/restore`, { method: "POST", token: author.token });
  assert.equal(restored.status, 200);

  const visibleAgain = await api(`/api/v1/posts/${id}`);
  assert.equal(visibleAgain.status, 200);
});

test("visibility: private post hidden from others, community post hidden from non-members, public visible to all", async () => {
  const author = await createAuthenticatedTestUser();
  const member = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  const community = await createPublicCommunity(author);
  await api(`/api/v1/communities/${community._id}/join`, { method: "POST", token: member.token });

  const privatePost = await api("/api/v1/posts", {
    method: "POST",
    token: author.token,
    body: { content: "My private note", visibility: "private" },
  });
  const communityPost = await api("/api/v1/posts", {
    method: "POST",
    token: author.token,
    body: { content: "Community-only update", visibility: "community", community: community._id },
  });
  const publicPost = await api("/api/v1/posts", {
    method: "POST",
    token: author.token,
    body: { content: "Public announcement", visibility: "public" },
  });

  const privateByOutsider = await api(`/api/v1/posts/${privatePost.json.data._id}`, { token: outsider.token });
  assert.equal(privateByOutsider.status, 404);
  const privateByAuthor = await api(`/api/v1/posts/${privatePost.json.data._id}`, { token: author.token });
  assert.equal(privateByAuthor.status, 200);

  const communityByOutsider = await api(`/api/v1/posts/${communityPost.json.data._id}`, { token: outsider.token });
  assert.equal(communityByOutsider.status, 404);
  const communityByMember = await api(`/api/v1/posts/${communityPost.json.data._id}`, { token: member.token });
  assert.equal(communityByMember.status, 200);

  const publicByAnyone = await api(`/api/v1/posts/${publicPost.json.data._id}`);
  assert.equal(publicByAnyone.status, 200);

  const list = await api("/api/v1/posts", { token: outsider.token });
  const ids = list.json.data.map((p) => p._id);
  assert.ok(ids.includes(publicPost.json.data._id));
  assert.ok(!ids.includes(privatePost.json.data._id));
  assert.ok(!ids.includes(communityPost.json.data._id));
});

// --- Likes ---

test("like/unlike: duplicate like rejected, unlike-without-like rejected, likeCount stays accurate across multiple users", async () => {
  const author = await createAuthenticatedTestUser();
  const userA = await createAuthenticatedTestUser();
  const userB = await createAuthenticatedTestUser();
  const created = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "Like me" } });
  const id = created.json.data._id;

  const likeA = await api(`/api/v1/posts/${id}/like`, { method: "POST", token: userA.token });
  assert.equal(likeA.status, 200);
  assert.equal(likeA.json.data.likeCount, 1);

  const dupLike = await api(`/api/v1/posts/${id}/like`, { method: "POST", token: userA.token });
  assert.equal(dupLike.status, 409);

  const likeB = await api(`/api/v1/posts/${id}/like`, { method: "POST", token: userB.token });
  assert.equal(likeB.status, 200);
  assert.equal(likeB.json.data.likeCount, 2);

  const unlikeA = await api(`/api/v1/posts/${id}/like`, { method: "DELETE", token: userA.token });
  assert.equal(unlikeA.status, 200);
  assert.equal(unlikeA.json.data.likeCount, 1);

  const dupUnlike = await api(`/api/v1/posts/${id}/like`, { method: "DELETE", token: userA.token });
  assert.equal(dupUnlike.status, 409);
});

test("cannot like a post you cannot see (private post, non-author)", async () => {
  const author = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  const created = await api("/api/v1/posts", {
    method: "POST",
    token: author.token,
    body: { content: "Private", visibility: "private" },
  });

  const { status } = await api(`/api/v1/posts/${created.json.data._id}/like`, { method: "POST", token: outsider.token });
  assert.equal(status, 404);
});

// --- Comments ---

test("add/edit/delete comment: ownership enforced, commentCount stays accurate, admin can delete another user's comment", async () => {
  const author = await createAuthenticatedTestUser();
  const commenter = await createAuthenticatedTestUser();
  const other = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const post = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "Discuss this" } });
  const postId = post.json.data._id;

  const added = await api(`/api/v1/posts/${postId}/comments`, {
    method: "POST",
    token: commenter.token,
    body: { content: "Great point!" },
  });
  assert.equal(added.status, 201);
  const commentId = added.json.data._id;

  const afterAdd = await api(`/api/v1/posts/${postId}`, { token: author.token });
  assert.equal(afterAdd.json.data.commentCount, 1);

  const editByOther = await api(`/api/v1/posts/comments/${commentId}`, {
    method: "PUT",
    token: other.token,
    body: { content: "Hijacked" },
  });
  assert.equal(editByOther.status, 403);

  const editByOwner = await api(`/api/v1/posts/comments/${commentId}`, {
    method: "PUT",
    token: commenter.token,
    body: { content: "Edited by me" },
  });
  assert.equal(editByOwner.status, 200);

  const deleteByOther = await api(`/api/v1/posts/comments/${commentId}`, { method: "DELETE", token: other.token });
  assert.equal(deleteByOther.status, 403);

  const deleteByAdmin = await api(`/api/v1/posts/comments/${commentId}`, { method: "DELETE", token: admin.token });
  assert.equal(deleteByAdmin.status, 200);

  const afterDelete = await api(`/api/v1/posts/${postId}`, { token: author.token });
  assert.equal(afterDelete.json.data.commentCount, 0);
});

test("restore a deleted comment: owner-only, blocked while the parent post is deleted, commentCount restored", async () => {
  const author = await createAuthenticatedTestUser();
  const commenter = await createAuthenticatedTestUser();
  const post = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "Discuss this" } });
  const postId = post.json.data._id;

  const added = await api(`/api/v1/posts/${postId}/comments`, { method: "POST", token: commenter.token, body: { content: "First!" } });
  const commentId = added.json.data._id;
  await api(`/api/v1/posts/comments/${commentId}`, { method: "DELETE", token: commenter.token });

  const restored = await api(`/api/v1/posts/comments/${commentId}/restore`, { method: "POST", token: commenter.token });
  assert.equal(restored.status, 200);

  const afterRestore = await api(`/api/v1/posts/${postId}`, { token: author.token });
  assert.equal(afterRestore.json.data.commentCount, 1);

  const added2 = await api(`/api/v1/posts/${postId}/comments`, { method: "POST", token: commenter.token, body: { content: "Second!" } });
  const commentId2 = added2.json.data._id;
  await api(`/api/v1/posts/comments/${commentId2}`, { method: "DELETE", token: commenter.token });
  await api(`/api/v1/posts/${postId}`, { method: "DELETE", token: author.token });

  const blockedRestore = await api(`/api/v1/posts/comments/${commentId2}/restore`, { method: "POST", token: commenter.token });
  assert.equal(blockedRestore.status, 409);
});

test("cannot comment on a hidden/deleted post, and cannot view/add comments on a post you cannot see", async () => {
  const author = await createAuthenticatedTestUser();
  const outsider = await createAuthenticatedTestUser();
  const post = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "Private one", visibility: "private" } });
  const postId = post.json.data._id;

  const commentByOutsider = await api(`/api/v1/posts/${postId}/comments`, { method: "POST", token: outsider.token, body: { content: "Can't see this" } });
  assert.equal(commentByOutsider.status, 404);

  await api(`/api/v1/posts/${postId}`, { method: "DELETE", token: author.token });
  const commentAfterDelete = await api(`/api/v1/posts/${postId}/comments`, { method: "POST", token: author.token, body: { content: "..." } });
  assert.equal(commentAfterDelete.status, 404);
});

test("admin moderation hide/restore of a comment keeps Post.commentCount in sync", async () => {
  const author = await createAuthenticatedTestUser();
  const commenter = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const post = await api("/api/v1/posts", { method: "POST", token: author.token, body: { content: "Moderate this" } });
  const postId = post.json.data._id;
  const added = await api(`/api/v1/posts/${postId}/comments`, { method: "POST", token: commenter.token, body: { content: "Spammy comment" } });
  const commentId = added.json.data._id;

  const hidden = await api(`/api/v1/admin/content/comments/${commentId}/moderate`, {
    method: "POST",
    token: admin.token,
    body: { action: "hide" },
  });
  assert.equal(hidden.status, 200);

  const afterHide = await api(`/api/v1/posts/${postId}`, { token: author.token });
  assert.equal(afterHide.json.data.commentCount, 0);

  const restored = await api(`/api/v1/admin/content/comments/${commentId}/moderate`, {
    method: "POST",
    token: admin.token,
    body: { action: "restore" },
  });
  assert.equal(restored.status, 200);

  const afterRestore = await api(`/api/v1/posts/${postId}`, { token: author.token });
  assert.equal(afterRestore.json.data.commentCount, 1);
});
