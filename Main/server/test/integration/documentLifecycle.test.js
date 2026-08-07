// Document module integration tests. Runs the real Express app over HTTP
// with real multipart uploads against an in-memory MongoDB instance and the
// real local-disk storage provider. Complements the existing thorough
// service-level documentAuthorization.test.js (full owner/admin/
// contributor/unrelated permission matrix, storage-abstraction basics) -
// this file exercises routes/controller/validators/multer plus everything
// added in this phase: archive/restore lifecycle, platform-admin override,
// signed/expiring download URLs, storage-failure cleanup, and edge cases.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const Project = require("../../src/models/Project");
const Document = require("../../src/models/Document");
const Team = require("../../src/models/Team");
const documentService = require("../../src/services/documentService");
const storageService = require("../../src/services/storageService");
const Workspace = require("../../src/models/Workspace");

const STORAGE_ROOT = path.join(__dirname, "..", "..", "storage", "documents");

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
  // Shared with documentAuthorization.test.js/applicationAuthorization.test.js -
  // node --test runs files concurrently, retry to avoid racing their cleanup.
  await fs.rm(STORAGE_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
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

async function uploadDoc(
  pathName,
  { token, projectId, title = `Doc ${Date.now()}${Math.floor(Math.random() * 1e6)}`, description, fileName = "fixture.pdf", mimeType = "application/pdf", content = "%PDF-1.4 fixture" } = {}
) {
  const form = new FormData();
  if (projectId !== undefined) form.append("projectId", String(projectId));
  if (title !== undefined) form.append("title", title);
  if (description !== undefined) form.append("description", description);
  form.append("document", new Blob([content], { type: mimeType }), fileName);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${pathName}`, { method: "POST", headers, body: form });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function makeAdmin() {
  return createAuthenticatedTestUser({ role: "admin" });
}

// --- Create + validation ---

test("create rejects unauthenticated", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await uploadDoc("/api/v1/documents", { projectId: fx.project._id });
  assert.equal(status, 401);
});

test("create rejects a request with no file", async () => {
  const fx = await createCollaborationFixture();
  const form = new FormData();
  form.append("projectId", String(fx.project._id));
  form.append("title", "No File");
  const res = await fetch(`${baseUrl}/api/v1/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${fx.founder.token}` },
    body: form,
  });
  assert.equal(res.status, 400);
});

test("create rejects an unsupported file type", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await uploadDoc("/api/v1/documents", {
    token: fx.founder.token,
    projectId: fx.project._id,
    mimeType: "application/x-executable",
    fileName: "malware.exe",
  });
  assert.equal(status, 400);
});

test("create rejects a title shorter than 2 chars (validation)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id, title: "A" });
  assert.equal(status, 400);
});

test("create returns 404 for a nonexistent project", async () => {
  const fx = await createCollaborationFixture();
  const fakeId = new mongoose.Types.ObjectId();
  const { status } = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fakeId });
  assert.equal(status, 404);
});

test("create is rejected against an archived project with 409", async () => {
  const fx = await createCollaborationFixture();
  await Project.findByIdAndUpdate(fx.project._id, { isArchived: true });
  const { status } = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id });
  assert.equal(status, 409);
});

test("unrelated user cannot upload (403)", async () => {
  const fx = await createCollaborationFixture();
  const { status } = await uploadDoc("/api/v1/documents", { token: fx.unrelatedUser.token, projectId: fx.project._id });
  assert.equal(status, 403);
});

// --- Permission matrix ---

test("permission matrix: founder, workspace-admin and contributor can all upload; unrelated cannot", async () => {
  const fx = await createCollaborationFixture();
  const byFounder = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id, title: "By Founder" });
  assert.equal(byFounder.status, 201);

  const byAdmin = await uploadDoc("/api/v1/documents", { token: fx.adminMember.token, projectId: fx.project._id, title: "By Admin" });
  assert.equal(byAdmin.status, 201);

  const byContributor = await uploadDoc("/api/v1/documents", { token: fx.contributorMember.token, projectId: fx.project._id, title: "By Contributor" });
  assert.equal(byContributor.status, 201);
});

test("contributor can update/archive their own document but not someone else's", async () => {
  const fx = await createCollaborationFixture();
  const own = await uploadDoc("/api/v1/documents", { token: fx.contributorMember.token, projectId: fx.project._id, title: "Mine" });
  const updateOwn = await api(`/api/v1/documents/${own.json.data._id}`, { method: "PUT", token: fx.contributorMember.token, body: { title: "Mine, edited" } });
  assert.equal(updateOwn.status, 200);

  const founders = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id, title: "Founder's" });
  const updateOthers = await api(`/api/v1/documents/${founders.json.data._id}`, { method: "PUT", token: fx.contributorMember.token, body: { title: "hijacked" } });
  assert.equal(updateOthers.status, 403);
});

test("a platform admin can create/update/archive/restore a document in a workspace they have no role in", async () => {
  const fx = await createCollaborationFixture();
  const admin = await makeAdmin();

  const created = await uploadDoc("/api/v1/documents", { token: admin.token, projectId: fx.project._id, title: "Admin Doc" });
  assert.equal(created.status, 201);
  const id = created.json.data._id;

  const updated = await api(`/api/v1/documents/${id}`, { method: "PUT", token: admin.token, body: { description: "edited" } });
  assert.equal(updated.status, 200);

  const archived = await api(`/api/v1/documents/${id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);

  const restored = await api(`/api/v1/documents/${id}/restore`, { method: "POST", token: admin.token });
  assert.equal(restored.status, 200);
});

// --- Get + signed download URL ---

test("get returns a signed, expiring download URL; 404 for nonexistent; 403 for unrelated", async () => {
  const fx = await createCollaborationFixture();
  const created = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id });

  const { status, json } = await api(`/api/v1/documents/${created.json.data._id}`, { token: fx.founder.token });
  assert.equal(status, 200);
  assert.match(json.data.url, /expires=\d+/);
  assert.match(json.data.url, /signature=[0-9a-f]+/);

  const fakeId = new mongoose.Types.ObjectId();
  const notFound = await api(`/api/v1/documents/${fakeId}`, { token: fx.founder.token });
  assert.equal(notFound.status, 404);

  const unauthorized = await api(`/api/v1/documents/${created.json.data._id}`, { token: fx.unrelatedUser.token });
  assert.equal(unauthorized.status, 403);
});

test("verifyDownloadToken accepts a fresh signature, rejects tampering and expiry", async () => {
  const fx = await createCollaborationFixture();
  const created = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id });
  const doc = await documentService.getDocumentById(created.json.data._id);
  const url = await documentService.getDownloadUrl(doc);
  const params = new URL(url, "http://localhost").searchParams;
  const expires = params.get("expires");
  const signature = params.get("signature");

  assert.equal(storageService.verifyDownloadToken(doc.storageKey, expires, signature), true);
  assert.equal(storageService.verifyDownloadToken(doc.storageKey, expires, "0".repeat(signature.length)), false);
  assert.equal(storageService.verifyDownloadToken(doc.storageKey, Date.now() - 1000, signature), false);
});

// --- Archive/restore lifecycle ---

test("archive hides a document from the default list; restore brings it back and re-allows edits", async () => {
  const fx = await createCollaborationFixture();
  const created = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id });
  const id = created.json.data._id;

  const archived = await api(`/api/v1/documents/${id}`, { method: "DELETE", token: fx.founder.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);

  const list = await api("/api/v1/documents", { token: fx.founder.token });
  assert.ok(!list.json.data.some((d) => d._id === id));

  const blockedUpdate = await api(`/api/v1/documents/${id}`, { method: "PUT", token: fx.founder.token, body: { title: "should fail" } });
  assert.equal(blockedUpdate.status, 409);

  const restored = await api(`/api/v1/documents/${id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);

  const editAfterRestore = await api(`/api/v1/documents/${id}`, { method: "PUT", token: fx.founder.token, body: { title: "edited after restore" } });
  assert.equal(editAfterRestore.status, 200);
});

test("update and restore are blocked while the parent project is archived", async () => {
  const fx = await createCollaborationFixture();
  const created = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id });
  await api(`/api/v1/documents/${created.json.data._id}`, { method: "DELETE", token: fx.founder.token });
  await Project.findByIdAndUpdate(fx.project._id, { isArchived: true });

  const restore = await api(`/api/v1/documents/${created.json.data._id}/restore`, { method: "POST", token: fx.founder.token });
  assert.equal(restore.status, 409);
});

// --- Storage-failure cleanup (service-level, needs to stub Document.create) ---

test("if the DB insert fails after a successful upload, the orphaned file is cleaned up from storage", async () => {
  const fx = await createCollaborationFixture();
  const originalCreate = Document.create;
  const originalRemove = storageService.remove;
  let removeCalledWith = null;

  Document.create = async () => {
    throw new Error("simulated DB failure");
  };
  storageService.remove = async (provider, key) => {
    removeCalledWith = [provider, key];
    return originalRemove(provider, key);
  };

  try {
    await assert.rejects(() =>
      documentService.createDocument(
        { projectId: fx.project._id, title: "Doomed Upload", buffer: Buffer.from("data"), mimeType: "application/pdf", originalFileName: "x.pdf" },
        fx.founder.user._id
      )
    );
    assert.ok(removeCalledWith, "storageService.remove should have been called to clean up the orphaned file");
    assert.equal(removeCalledWith[0], "local");
  } finally {
    Document.create = originalCreate;
    storageService.remove = originalRemove;
  }
});

// --- Edge cases ---

test("a member removed from the team loses access to documents in that project", async () => {
  const fx = await createCollaborationFixture();
  const created = await uploadDoc("/api/v1/documents", { token: fx.contributorMember.token, projectId: fx.project._id });

  const team = await Team.findById(fx.team._id).lean();
  const memberRecord = team.members.find((m) => String(m.user) === String(fx.contributorMember.user._id));
  await api(`/api/v1/teams/${fx.team._id}/members/${memberRecord._id}`, { method: "DELETE", token: fx.founder.token });

  const afterRemoval = await api(`/api/v1/documents/${created.json.data._id}`, { token: fx.contributorMember.token });
  assert.equal(afterRemoval.status, 403);
});

test("uploading to a project still succeeds while only the workspace (not the project) is archived - documented layered-authorization design, not a bug", async () => {
  const fx = await createCollaborationFixture();
  await Workspace.findByIdAndUpdate(fx.workspace._id, { isArchived: true });

  const { status } = await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id });
  assert.equal(status, 201);
});

// --- Cross-project / cross-startup isolation ---

test("a member of workspace A cannot view, update, or filter into workspace B's documents", async () => {
  const fxA = await createCollaborationFixture();
  const fxB = await createCollaborationFixture();
  const docB = await uploadDoc("/api/v1/documents", { token: fxB.founder.token, projectId: fxB.project._id });

  const view = await api(`/api/v1/documents/${docB.json.data._id}`, { token: fxA.founder.token });
  assert.equal(view.status, 403);

  const update = await api(`/api/v1/documents/${docB.json.data._id}`, { method: "PUT", token: fxA.founder.token, body: { title: "cross-tenant" } });
  assert.equal(update.status, 403);

  const listFiltered = await api(`/api/v1/documents?projectId=${fxB.project._id}`, { token: fxA.founder.token });
  assert.equal(listFiltered.status, 403);
});

// --- Pagination / filtering / search ---

test("list supports pagination via flat limit/skip", async () => {
  const fx = await createCollaborationFixture();
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id, title: `Page Doc ${i}` });
  }
  const { json } = await api("/api/v1/documents?limit=2&skip=0", { token: fx.founder.token });
  assert.equal(json.data.length, 2);
});

test("list supports search by title", async () => {
  const fx = await createCollaborationFixture();
  await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id, title: "Searchable Rocket Doc" });
  await uploadDoc("/api/v1/documents", { token: fx.founder.token, projectId: fx.project._id, title: "Something Else" });

  const { json } = await api("/api/v1/documents?search=Rocket", { token: fx.founder.token });
  assert.equal(json.data.length, 1);
  assert.equal(json.data[0].title, "Searchable Rocket Doc");
});
