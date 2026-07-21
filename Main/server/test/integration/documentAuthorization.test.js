// Documents Module, Phase: integration tests. Verifies documentService
// (including the real local-disk storageService provider) against a real
// MongoDB instance and a real filesystem. Out of scope: validators,
// controllers, routes, performance, any non-local storage provider.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const documentService = require("../../src/services/documentService");
const projectService = require("../../src/services/projectService");

const STORAGE_ROOT = path.join(__dirname, "..", "..", "storage", "documents");

function samplePdfPayload(title) {
  return {
    title,
    buffer: Buffer.from("%PDF-1.4 fixture content for " + title),
    mimeType: "application/pdf",
    originalFileName: "fixture.pdf",
  };
}

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
  // Clean up any files this test file wrote to the real local-disk provider.
  // maxRetries/retryDelay: applicationAuthorization.test.js shares this same
  // directory and cleans it up too — node --test runs files concurrently,
  // so a bare rm can race with the other file's rm (ENOTEMPTY on Windows).
  await fs.rm(STORAGE_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

beforeEach(async () => {
  await clearDatabase();
});

// --- Storage abstraction (no delivery URL persisted) ---

test("uploading a document does not persist a URL — only storageProvider/storageKey/checksum", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Pitch Deck") },
    fx.founder.user._id
  );

  assert.equal(doc.storageProvider, "local");
  assert.ok(doc.storageKey);
  assert.ok(doc.checksum);
  assert.equal(doc.url, undefined);

  const fileExists = await fs
    .access(path.join(STORAGE_ROOT, doc.storageKey))
    .then(() => true)
    .catch(() => false);
  assert.ok(fileExists, "uploaded file should actually exist on disk under the local provider");
});

test("getDownloadUrl generates a URL on demand, not read from a stored field", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("On-demand URL Doc") },
    fx.founder.user._id
  );

  const url = await documentService.getDownloadUrl(doc);
  assert.ok(url.includes(doc.storageKey));
});

// --- Owner/Admin: manage any document ---

test("owner can upload a document", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Owner Upload") },
    fx.founder.user._id
  );
  assert.equal(String(doc.createdBy), String(fx.founder.user._id));
});

test("admin can update metadata on a document uploaded by someone else", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Founder's Doc") },
    fx.founder.user._id
  );
  const updated = await documentService.updateDocument(doc._id, fx.adminMember.user._id, {
    title: "Edited by admin",
  });
  assert.equal(updated.title, "Edited by admin");
});

test("admin can archive a document uploaded by someone else", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("To Archive By Admin") },
    fx.founder.user._id
  );
  const archived = await documentService.archiveDocument(doc._id, fx.adminMember.user._id);
  assert.equal(archived.isArchived, true);
});

// --- Contributor: upload, view, update own, archive own ---

test("contributor can upload a document", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Contributor Upload") },
    fx.contributorMember.user._id
  );
  assert.equal(String(doc.createdBy), String(fx.contributorMember.user._id));
});

test("contributor can view any document in an accessible project", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Founder's Doc, Viewable") },
    fx.founder.user._id
  );
  await assert.doesNotReject(() => documentService.assertDocumentViewAccess(doc, fx.contributorMember.user._id));
});

test("contributor can update metadata on a document they uploaded", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Mine") },
    fx.contributorMember.user._id
  );
  const updated = await documentService.updateDocument(doc._id, fx.contributorMember.user._id, {
    title: "Mine, edited",
  });
  assert.equal(updated.title, "Mine, edited");
});

test("contributor can archive a document they uploaded", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Mine To Archive") },
    fx.contributorMember.user._id
  );
  const archived = await documentService.archiveDocument(doc._id, fx.contributorMember.user._id);
  assert.equal(archived.isArchived, true);
});

test("contributor CANNOT update metadata on another user's document", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Founder's Private Doc") },
    fx.founder.user._id
  );
  await assert.rejects(
    () => documentService.updateDocument(doc._id, fx.contributorMember.user._id, { title: "Hijacked" }),
    /not authorized/
  );
});

test("contributor CANNOT archive another user's document", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Founder's Doc To Protect") },
    fx.founder.user._id
  );
  await assert.rejects(
    () => documentService.archiveDocument(doc._id, fx.contributorMember.user._id),
    /not authorized/
  );
});

// --- Unrelated users ---

test("unrelated user cannot upload a document to the project", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () =>
      documentService.createDocument(
        { projectId: fx.project._id, ...samplePdfPayload("Intruder Upload") },
        fx.unrelatedUser.user._id
      ),
    /not authorized/
  );
});

test("unrelated user cannot view a document in the project", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Target") },
    fx.founder.user._id
  );
  await assert.rejects(
    () => documentService.assertDocumentViewAccess(doc, fx.unrelatedUser.user._id),
    /not authorized/
  );
});

test("unrelated user cannot update or archive a document in the project", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Target") },
    fx.founder.user._id
  );
  await assert.rejects(
    () => documentService.updateDocument(doc._id, fx.unrelatedUser.user._id, { title: "Tampered" }),
    /not authorized/
  );
  await assert.rejects(
    () => documentService.archiveDocument(doc._id, fx.unrelatedUser.user._id),
    /not authorized/
  );
});

// --- Archived-project guard ---
// Document's immediate parent is Project (not Workspace) — the guard checks
// project.isArchived, same layer-checks-its-immediate-parent pattern Task
// uses (Task checks project.isArchived; Project checks workspace.isArchived).

test("uploading a document fails when the parent project itself is archived", async () => {
  const fx = await createCollaborationFixture();
  await projectService.archiveProject(fx.project._id, fx.founder.user._id);

  await assert.rejects(
    () =>
      documentService.createDocument(
        { projectId: fx.project._id, ...samplePdfPayload("Should Not Upload") },
        fx.founder.user._id
      ),
    /archived/
  );
});

// --- Regression: list project-filter authorization (same recurring bug class as Project/Task) ---

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?projectId= filter", async () => {
  const fx = await createCollaborationFixture();
  await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Should Stay Hidden") },
    fx.founder.user._id
  );

  await assert.rejects(
    () => documentService.listDocumentsForUser(fx.unrelatedUser.user._id, { project: fx.project._id }, {}),
    /not authorized/
  );
});

test("a user with project access CAN use an explicit ?projectId= filter to see documents", async () => {
  const fx = await createCollaborationFixture();
  const doc = await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Visible") },
    fx.founder.user._id
  );

  const documents = await documentService.listDocumentsForUser(
    fx.founder.user._id,
    { project: fx.project._id },
    {}
  );
  const ids = documents.map((d) => String(d._id));
  assert.ok(ids.includes(String(doc._id)));
});

test("an unrelated user sees no documents via listDocumentsForUser with no filter", async () => {
  const fx = await createCollaborationFixture();
  await documentService.createDocument(
    { projectId: fx.project._id, ...samplePdfPayload("Not Yours") },
    fx.founder.user._id
  );

  const documents = await documentService.listDocumentsForUser(fx.unrelatedUser.user._id, {}, {});
  assert.equal(documents.length, 0);
});
