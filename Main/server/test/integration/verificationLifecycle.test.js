// Government ID / KYC + Admin Verification integration tests (Phase 16B).
// Runs the real Express app over HTTP against an in-memory MongoDB
// instance. Complements the existing, lighter admin-side coverage in
// adminAuthorization.test.js (list/get/approve/reject/resubmission with
// audit-log assertions against fixtures already in "pending" state) - this
// file's job is the full end-to-end workflow: the user-facing upload/
// submit flow, the emailVerified prerequisite, file validation, document
// security (signed vs. raw URLs), and the state-guard/idempotency fixes
// this phase added.
//
// Cloudinary and email delivery are both mocked (monkey-patch + restore,
// same technique this session's auth/AI test suites already use) - no
// real network call is ever made, and no real email is ever sent.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const User = require("../../src/models/User");
const AuditLog = require("../../src/models/AuditLog");
const cloudinary = require("../../src/services/cloudinary.service");
const emailService = require("../../src/services/email.service");

let server;
let baseUrl;

const originalUploaderUpload = cloudinary.uploader.upload;
const originalUploaderDestroy = cloudinary.uploader.destroy;
const originalSendSubmitted = emailService.sendVerificationSubmittedEmail;
const originalSendApproved = emailService.sendVerificationApprovedEmail;
const originalSendRejected = emailService.sendVerificationRejectedEmail;
const originalSendResubmission = emailService.sendVerificationResubmissionEmail;

let sentEmails;

before(async () => {
  await setupTestDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  cloudinary.uploader.upload = async (dataUri, options) => ({
    secure_url: `https://res.cloudinary.com/fake/authenticated/${options.public_id}`,
    public_id: options.public_id,
    resource_type: "image",
    format: "jpg",
  });
  cloudinary.uploader.destroy = async () => ({ result: "ok" });

  for (const name of ["sendVerificationSubmittedEmail", "sendVerificationApprovedEmail", "sendVerificationRejectedEmail", "sendVerificationResubmissionEmail"]) {
    emailService[name] = async (payload) => {
      sentEmails.push({ name, ...payload });
    };
  }
});

after(async () => {
  cloudinary.uploader.upload = originalUploaderUpload;
  cloudinary.uploader.destroy = originalUploaderDestroy;
  emailService.sendVerificationSubmittedEmail = originalSendSubmitted;
  emailService.sendVerificationApprovedEmail = originalSendApproved;
  emailService.sendVerificationRejectedEmail = originalSendRejected;
  emailService.sendVerificationResubmissionEmail = originalSendResubmission;
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

beforeEach(async () => {
  sentEmails = [];
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

async function uploadDoc(token, type, { fileName = "id.jpg", mimeType = "image/jpeg", content = "fake image bytes" } = {}) {
  const form = new FormData();
  form.append("document", new Blob([content], { type: mimeType }), fileName);
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api/v1/verification/documents/${type}`, { method: "POST", headers, body: form });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function makeVerifiedEmailUser(overrides = {}) {
  return createAuthenticatedTestUser({ emailVerified: true, ...overrides });
}

async function makeAdmin() {
  return createAuthenticatedTestUser({ role: "admin", emailVerified: true });
}

const REQUIRED_TYPES = ["government_id", "company_registration", "business_website", "linkedin"];

async function uploadAllRequiredDocs(token) {
  for (const type of REQUIRED_TYPES) {
    // eslint-disable-next-line no-await-in-loop
    const { status } = await uploadDoc(token, type);
    assert.equal(status, 200, `expected upload of ${type} to succeed`);
  }
}

// --- User-facing: prerequisites, upload, submit ---

test("unauthenticated user cannot submit verification or upload documents", async () => {
  const noToken1 = await api("/api/v1/verification/submit", { method: "POST" });
  assert.equal(noToken1.status, 401);

  const noToken2 = await uploadDoc(undefined, "government_id");
  assert.equal(noToken2.status, 401);
});

test("an account with an unverified email cannot upload documents or submit (KYC prerequisite)", async () => {
  const user = await createAuthenticatedTestUser({ emailVerified: false });

  const upload = await uploadDoc(user.token, "government_id");
  assert.equal(upload.status, 403);
  assert.match(upload.json.message, /verify your email/i);

  const submit = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(submit.status, 403);
});

test("valid government ID upload succeeds and appears in the user's own verification status", async () => {
  const user = await makeVerifiedEmailUser();
  const { status, json } = await uploadDoc(user.token, "government_id");
  assert.equal(status, 200);
  assert.equal(json.data.documents.length, 1);
  assert.equal(json.data.documents[0].type, "government_id");
  assert.equal(json.data.status, "draft");
});

test("an invalid file type is rejected", async () => {
  const user = await makeVerifiedEmailUser();
  const { status, json } = await uploadDoc(user.token, "government_id", { fileName: "malware.exe", mimeType: "application/x-msdownload" });
  assert.equal(status, 400);
  assert.match(json.message, /jpg|png|webp|pdf/i);
});

test("an oversized file is rejected with a clean 400, not a raw 500", async () => {
  const user = await makeVerifiedEmailUser();
  const bigContent = "a".repeat(11 * 1024 * 1024); // 11MB > the 10MB limit
  const { status, json } = await uploadDoc(user.token, "government_id", { content: bigContent });
  assert.equal(status, 400);
  assert.match(json.message, /too large/i);
});

test("an unsupported document type is rejected", async () => {
  const user = await makeVerifiedEmailUser();
  const { status } = await uploadDoc(user.token, "not_a_real_type");
  assert.equal(status, 400);
});

test("submit rejects when required documents are missing", async () => {
  const user = await makeVerifiedEmailUser();
  await uploadDoc(user.token, "government_id");
  const { status, json } = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(status, 400);
  assert.match(json.message, /required verification documents/i);
});

test("full submission flow: uploads + submit creates a pending request, sends a confirmation email, and writes an audit entry", async () => {
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);

  const { status, json } = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(status, 200);
  assert.equal(json.data.status, "pending");
  assert.ok(json.data.submittedAt);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.verificationStatus, "pending");

  assert.ok(sentEmails.some((e) => e.name === "sendVerificationSubmittedEmail" && e.to === user.user.email));

  const logs = await AuditLog.find({ action: "verification.submit", actor: user.user._id }).lean();
  assert.equal(logs.length, 1);

  const uploadLogs = await AuditLog.find({ action: "verification.document_upload", actor: user.user._id }).lean();
  assert.equal(uploadLogs.length, REQUIRED_TYPES.length);
});

test("cannot re-submit or change documents while a submission is pending", async () => {
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });

  const reupload = await uploadDoc(user.token, "government_id");
  assert.equal(reupload.status, 400);

  const resubmit = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(resubmit.status, 400);
});

test("each user's documents are isolated from every other user's (no cross-account leakage)", async () => {
  const userA = await makeVerifiedEmailUser();
  const userB = await makeVerifiedEmailUser();
  await uploadDoc(userA.token, "government_id", { fileName: "a.jpg" });
  await uploadDoc(userB.token, "government_id", { fileName: "b.jpg" });

  const viewA = await api("/api/v1/verification", { token: userA.token });
  const viewB = await api("/api/v1/verification", { token: userB.token });
  assert.equal(viewA.json.data.documents[0].name, "a.jpg");
  assert.equal(viewB.json.data.documents[0].name, "b.jpg");
});

test("document URLs are signed, time-limited access URLs, not the raw stored URL", async () => {
  const user = await makeVerifiedEmailUser();
  await uploadDoc(user.token, "government_id");
  const { json } = await api("/api/v1/verification", { token: user.token });

  const returnedUrl = json.data.documents[0].url;
  assert.ok(returnedUrl, "expected a signed URL to be returned");
  // A signed Cloudinary download URL is built from the /:resource_type/
  // authenticated "download" API endpoint with a signature/expiry in the
  // query string - not the plain secure_url captured at upload time.
  assert.match(returnedUrl, /expires_at|signature|api_key/);

  const persisted = await User.findById(user.user._id).lean();
  assert.notEqual(returnedUrl, persisted.verificationDocuments[0].url);
});

test("a suspended user cannot submit verification (protected by the existing authenticate middleware)", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  const suspend = await api(`/api/v1/admin/users/${user.user._id}/suspend`, {
    method: "POST",
    token: admin.token,
    body: { reason: "test" },
  });
  assert.equal(suspend.status, 200);

  const { status } = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(status, 403);
});

// --- Admin-facing ---

test("a pending submission appears in the admin queue, and non-admins are rejected from it", async () => {
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });

  const admin = await makeAdmin();
  const list = await api("/api/v1/admin/verifications", { token: admin.token });
  assert.equal(list.status, 200);
  assert.ok(list.json.data.some((entry) => String(entry._id) === String(user.user._id)));
  // List view is metadata-only - no signed URLs generated for a queue the
  // admin is just triaging.
  assert.equal(list.json.data[0].verificationDocuments[0].url, undefined);

  const nonAdmin = await makeVerifiedEmailUser();
  const denied = await api("/api/v1/admin/verifications", { token: nonAdmin.token });
  assert.equal(denied.status, 403);
});

test("admin can access a pending user's verification documents via signed URLs; a non-admin cannot reach the endpoint at all", async () => {
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });

  const admin = await makeAdmin();
  const { status, json } = await api(`/api/v1/admin/verifications/${user.user._id}`, { token: admin.token });
  assert.equal(status, 200);
  assert.ok(json.data.verificationDocuments[0].url);
  assert.match(json.data.verificationDocuments[0].url, /expires_at|signature|api_key/);

  const nonAdmin = await makeVerifiedEmailUser();
  const denied = await api(`/api/v1/admin/verifications/${user.user._id}`, { token: nonAdmin.token });
  assert.equal(denied.status, 403);
});

test("a malformed userId on any admin verification endpoint returns 400, not a raw 500", async () => {
  const admin = await makeAdmin();
  const { status, json } = await api("/api/v1/admin/verifications/not-a-valid-id", { token: admin.token });
  assert.equal(status, 400);
  assert.match(json.message, /invalid user id/i);
});

test("approving a user with no pending submission (missing documents) is rejected, not silently approved", async () => {
  const admin = await makeAdmin();
  const neverSubmitted = await makeVerifiedEmailUser();

  const { status, json } = await api(`/api/v1/admin/verifications/${neverSubmitted.user._id}/approve`, {
    method: "POST",
    token: admin.token,
  });
  assert.equal(status, 409);
  assert.match(json.message, /no pending verification submission/i);

  const persisted = await User.findById(neverSubmitted.user._id);
  assert.equal(persisted.isVerified, false);
});

test("approval sends an approval email and updates verification state", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });

  const { status, json } = await api(`/api/v1/admin/verifications/${user.user._id}/approve`, { method: "POST", token: admin.token });
  assert.equal(status, 200);
  assert.equal(json.data.verificationStatus, "approved");
  assert.equal(json.data.isVerified, true);
  assert.ok(sentEmails.some((e) => e.name === "sendVerificationApprovedEmail" && e.to === user.user.email));
});

test("rejection sends a rejection email and updates verification state", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });

  const { status, json } = await api(`/api/v1/admin/verifications/${user.user._id}/reject`, {
    method: "POST",
    token: admin.token,
    body: { reason: "Blurry photo" },
  });
  assert.equal(status, 200);
  assert.equal(json.data.verificationStatus, "rejected");
  assert.ok(sentEmails.some((e) => e.name === "sendVerificationRejectedEmail" && e.to === user.user.email));
});

test("duplicate approval is idempotent: second call succeeds without sending a second email", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });

  const first = await api(`/api/v1/admin/verifications/${user.user._id}/approve`, { method: "POST", token: admin.token });
  assert.equal(first.status, 200);
  const second = await api(`/api/v1/admin/verifications/${user.user._id}/approve`, { method: "POST", token: admin.token });
  assert.equal(second.status, 200);
  assert.equal(second.json.data.verificationStatus, "approved");

  const approvalEmails = sentEmails.filter((e) => e.name === "sendVerificationApprovedEmail");
  assert.equal(approvalEmails.length, 1, "expected exactly one approval email despite two approve calls");
});

test("duplicate rejection is idempotent: second call succeeds without sending a second email", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });

  await api(`/api/v1/admin/verifications/${user.user._id}/reject`, { method: "POST", token: admin.token, body: { reason: "x" } });
  const second = await api(`/api/v1/admin/verifications/${user.user._id}/reject`, { method: "POST", token: admin.token, body: { reason: "y" } });
  assert.equal(second.status, 200);
  assert.equal(second.json.data.verificationStatus, "rejected");

  const rejectionEmails = sentEmails.filter((e) => e.name === "sendVerificationRejectedEmail");
  assert.equal(rejectionEmails.length, 1, "expected exactly one rejection email despite two reject calls");
});

test("rejecting an already-approved account is refused (no accidental cross-state transition)", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  await api(`/api/v1/admin/verifications/${user.user._id}/approve`, { method: "POST", token: admin.token });

  const { status } = await api(`/api/v1/admin/verifications/${user.user._id}/reject`, {
    method: "POST",
    token: admin.token,
    body: { reason: "changed my mind" },
  });
  assert.equal(status, 409);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.verificationStatus, "approved");
});

test("after rejection, the user can re-upload documents and submit again", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await uploadAllRequiredDocs(user.token);
  await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  await api(`/api/v1/admin/verifications/${user.user._id}/reject`, { method: "POST", token: admin.token, body: { reason: "blurry" } });

  const reupload = await uploadDoc(user.token, "government_id", { fileName: "clearer.jpg" });
  assert.equal(reupload.status, 200);

  const resubmit = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(resubmit.status, 200);
  assert.equal(resubmit.json.data.status, "pending");
});
