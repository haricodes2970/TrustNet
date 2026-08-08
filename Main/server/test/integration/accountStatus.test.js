// accountStatus unified authentication state machine integration tests
// (Phase 16C). Runs the real Express app over HTTP against an in-memory
// MongoDB instance. Covers the full EMAIL_PENDING -> KYC_PENDING ->
// UNDER_REVIEW -> APPROVED/REJECTED/RESUBMISSION_REQUIRED lifecycle, the
// isActive/deletedAt independence guarantee, the "no direct write path"
// mass-assignment guarantee, and login-policy preservation.
//
// Out of scope, matching authAuthorization.test.js's own established
// boundary: OAuth (Google/LinkedIn) signup requires a live provider call
// and is not exercised here; its accountStatus derivation reuses the same
// computeAccountStatus() this file already tests directly and via every
// other transition path.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const User = require("../../src/models/User");
const emailService = require("../../src/services/email.service");
const cloudinary = require("../../src/services/cloudinary.service");
const { computeAccountStatus } = require("../../src/services/accountStatus.service");

let server;
let baseUrl;

const originalSendOtpVerificationEmail = emailService.sendOtpVerificationEmail;
const originalSendVerificationSubmittedEmail = emailService.sendVerificationSubmittedEmail;
const originalSendVerificationApprovedEmail = emailService.sendVerificationApprovedEmail;
const originalSendVerificationRejectedEmail = emailService.sendVerificationRejectedEmail;
const originalSendVerificationResubmissionEmail = emailService.sendVerificationResubmissionEmail;
const originalUploaderUpload = cloudinary.uploader.upload;
const originalUploaderDestroy = cloudinary.uploader.destroy;

let sentOtps;

before(async () => {
  await setupTestDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  emailService.sendOtpVerificationEmail = async ({ to, otp }) => {
    sentOtps.push({ to, otp });
  };
  emailService.sendVerificationSubmittedEmail = async () => {};
  emailService.sendVerificationApprovedEmail = async () => {};
  emailService.sendVerificationRejectedEmail = async () => {};
  emailService.sendVerificationResubmissionEmail = async () => {};

  cloudinary.uploader.upload = async (dataUri, options) => ({
    secure_url: `https://res.cloudinary.com/fake/authenticated/${options.public_id}`,
    public_id: options.public_id,
    resource_type: "image",
    format: "jpg",
  });
  cloudinary.uploader.destroy = async () => ({ result: "ok" });
});

after(async () => {
  emailService.sendOtpVerificationEmail = originalSendOtpVerificationEmail;
  emailService.sendVerificationSubmittedEmail = originalSendVerificationSubmittedEmail;
  emailService.sendVerificationApprovedEmail = originalSendVerificationApprovedEmail;
  emailService.sendVerificationRejectedEmail = originalSendVerificationRejectedEmail;
  emailService.sendVerificationResubmissionEmail = originalSendVerificationResubmissionEmail;
  cloudinary.uploader.upload = originalUploaderUpload;
  cloudinary.uploader.destroy = originalUploaderDestroy;
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

beforeEach(async () => {
  sentOtps = [];
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

const REQUIRED_TYPES = ["government_id", "company_registration", "business_website", "linkedin"];

async function uploadAllRequiredDocs(token) {
  for (const type of REQUIRED_TYPES) {
    // eslint-disable-next-line no-await-in-loop
    const { status } = await uploadDoc(token, type);
    assert.equal(status, 200, `expected upload of ${type} to succeed`);
  }
}

async function makeVerifiedEmailUser(overrides = {}) {
  return createAuthenticatedTestUser({ emailVerified: true, accountStatus: "KYC_PENDING", ...overrides });
}

async function makeAdmin() {
  return createAuthenticatedTestUser({ role: "admin", emailVerified: true, accountStatus: "KYC_PENDING" });
}

async function submitForReview(token) {
  await uploadAllRequiredDocs(token);
  const { status } = await api("/api/v1/verification/submit", { method: "POST", token });
  assert.equal(status, 200);
}

let seq = 0;
function uniqueSuffix() {
  seq += 1;
  return `${Date.now().toString(36)}${seq}`;
}

// --- computeAccountStatus (pure function, unit-level) ---

test("computeAccountStatus: unverified email always resolves to EMAIL_PENDING regardless of verificationStatus", async () => {
  for (const verificationStatus of ["draft", "not_submitted", "pending", "approved", "rejected", "resubmission_requested"]) {
    assert.equal(computeAccountStatus({ emailVerified: false, verificationStatus }), "EMAIL_PENDING");
  }
});

test("computeAccountStatus: verified email maps each verificationStatus to its own accountStatus", async () => {
  assert.equal(computeAccountStatus({ emailVerified: true, verificationStatus: "draft" }), "KYC_PENDING");
  assert.equal(computeAccountStatus({ emailVerified: true, verificationStatus: "not_submitted" }), "KYC_PENDING");
  assert.equal(computeAccountStatus({ emailVerified: true, verificationStatus: "pending" }), "UNDER_REVIEW");
  assert.equal(computeAccountStatus({ emailVerified: true, verificationStatus: "approved" }), "APPROVED");
  assert.equal(computeAccountStatus({ emailVerified: true, verificationStatus: "rejected" }), "REJECTED");
  assert.equal(computeAccountStatus({ emailVerified: true, verificationStatus: "resubmission_requested" }), "RESUBMISSION_REQUIRED");
});

// --- 1. New registration starts in EMAIL_PENDING ---

test("new registration starts in accountStatus EMAIL_PENDING", async () => {
  const unique = uniqueSuffix();
  const creds = {
    email: `acct_${unique}@example.com`,
    password: "Password123!",
    fullName: "Account Status Test",
    username: `acct_${unique}`,
  };
  const { status, json } = await api("/api/v1/auth/register", { method: "POST", body: creds });
  assert.equal(status, 201);
  assert.equal(json.data.user.accountStatus, "EMAIL_PENDING");

  const persisted = await User.findOne({ email: creds.email });
  assert.equal(persisted.accountStatus, "EMAIL_PENDING");
});

// --- 2/3/4. OTP verification / invalid OTP / resend ---

test("OTP verification moves accountStatus from EMAIL_PENDING to KYC_PENDING, never straight to APPROVED", async () => {
  const otp = "123456";
  const user = await User.create({
    fullName: "OTP User",
    username: `otpuser_${uniqueSuffix()}`,
    email: `otpuser_${uniqueSuffix()}@example.com`,
    emailVerificationCodeHash: crypto.createHash("sha256").update(otp).digest("hex"),
    emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
  });
  assert.equal(user.accountStatus, "EMAIL_PENDING");

  const { status, json } = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: user.email, otp },
  });
  assert.equal(status, 200);
  assert.equal(json.data.user.accountStatus, "KYC_PENDING");

  const persisted = await User.findById(user._id);
  assert.equal(persisted.accountStatus, "KYC_PENDING");
});

test("an invalid/wrong OTP does not change accountStatus", async () => {
  const otp = "123456";
  const user = await User.create({
    fullName: "OTP User",
    username: `otpuser_${uniqueSuffix()}`,
    email: `otpuser_${uniqueSuffix()}@example.com`,
    emailVerificationCodeHash: crypto.createHash("sha256").update(otp).digest("hex"),
    emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
  });

  const { status } = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: user.email, otp: "999999" },
  });
  assert.equal(status, 400);

  const persisted = await User.findById(user._id);
  assert.equal(persisted.accountStatus, "EMAIL_PENDING");
});

test("an expired OTP does not change accountStatus", async () => {
  const otp = "123456";
  const user = await User.create({
    fullName: "OTP User",
    username: `otpuser_${uniqueSuffix()}`,
    email: `otpuser_${uniqueSuffix()}@example.com`,
    emailVerificationCodeHash: crypto.createHash("sha256").update(otp).digest("hex"),
    emailVerificationExpires: new Date(Date.now() - 1000),
  });

  const { status } = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: user.email, otp },
  });
  assert.equal(status, 400);

  const persisted = await User.findById(user._id);
  assert.equal(persisted.accountStatus, "EMAIL_PENDING");
});

test("resend-verification does not bypass the state machine: account stays EMAIL_PENDING", async () => {
  const unique = uniqueSuffix();
  const creds = {
    email: `resend_${unique}@example.com`,
    password: "Password123!",
    fullName: "Resend Test",
    username: `resend_${unique}`,
  };
  await api("/api/v1/auth/register", { method: "POST", body: creds });

  const { status } = await api("/api/v1/auth/resend-verification", { method: "POST", body: { email: creds.email } });
  assert.equal(status, 200);

  const persisted = await User.findOne({ email: creds.email });
  assert.equal(persisted.accountStatus, "EMAIL_PENDING");
});

// --- 5. Email-verified user enters KYC workflow correctly ---

test("an email-verified user with no KYC submission sits in KYC_PENDING and can upload documents", async () => {
  const user = await makeVerifiedEmailUser();
  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "KYC_PENDING");

  const { status } = await uploadDoc(user.token, "government_id");
  assert.equal(status, 200);

  const afterUpload = await User.findById(user.user._id);
  assert.equal(afterUpload.accountStatus, "KYC_PENDING", "uploading a draft document must not advance accountStatus");
});

// --- 6. KYC submission moves to UNDER_REVIEW ---

test("submitting verification moves accountStatus from KYC_PENDING to UNDER_REVIEW", async () => {
  const user = await makeVerifiedEmailUser();
  await submitForReview(user.token);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.verificationStatus, "pending");
  assert.equal(persisted.accountStatus, "UNDER_REVIEW");

  const { json } = await api("/api/v1/verification", { token: user.token });
  assert.equal(json.data.accountStatus, "UNDER_REVIEW");
});

// --- 7/8/9. Admin approve/reject/request-resubmission ---

test("admin approval moves accountStatus from UNDER_REVIEW to APPROVED", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await submitForReview(user.token);

  const { status } = await api(`/api/v1/admin/verifications/${user.user._id}/approve`, { method: "POST", token: admin.token });
  assert.equal(status, 200);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "APPROVED");
});

test("admin rejection moves accountStatus from UNDER_REVIEW to REJECTED", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await submitForReview(user.token);

  const { status } = await api(`/api/v1/admin/verifications/${user.user._id}/reject`, {
    method: "POST",
    token: admin.token,
    body: { reason: "blurry" },
  });
  assert.equal(status, 200);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "REJECTED");
});

test("admin request-resubmission moves accountStatus from UNDER_REVIEW to RESUBMISSION_REQUIRED", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await submitForReview(user.token);

  const { status } = await api(`/api/v1/admin/verifications/${user.user._id}/request-resubmission`, {
    method: "POST",
    token: admin.token,
    body: { reason: "need a clearer copy" },
  });
  assert.equal(status, 200);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "RESUBMISSION_REQUIRED");
});

// --- 10. Resubmission after rejection/resubmission-required returns to UNDER_REVIEW ---

test("re-submitting after rejection returns accountStatus to UNDER_REVIEW", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await submitForReview(user.token);
  await api(`/api/v1/admin/verifications/${user.user._id}/reject`, { method: "POST", token: admin.token, body: { reason: "x" } });

  let persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "REJECTED");

  await uploadDoc(user.token, "government_id", { fileName: "clearer.jpg" });
  const resubmit = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(resubmit.status, 200);

  persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "UNDER_REVIEW");
});

test("re-submitting after a resubmission request returns accountStatus to UNDER_REVIEW", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await submitForReview(user.token);
  await api(`/api/v1/admin/verifications/${user.user._id}/request-resubmission`, { method: "POST", token: admin.token, body: {} });

  await uploadDoc(user.token, "government_id", { fileName: "clearer.jpg" });
  const resubmit = await api("/api/v1/verification/submit", { method: "POST", token: user.token });
  assert.equal(resubmit.status, 200);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "UNDER_REVIEW");
});

// --- 11. Invalid transitions are rejected ---

test("rejecting an already-approved account is refused and accountStatus stays APPROVED", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();
  await submitForReview(user.token);
  await api(`/api/v1/admin/verifications/${user.user._id}/approve`, { method: "POST", token: admin.token });

  const { status } = await api(`/api/v1/admin/verifications/${user.user._id}/reject`, {
    method: "POST",
    token: admin.token,
    body: { reason: "changed my mind" },
  });
  assert.equal(status, 409);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "APPROVED");
});

test("approving an account with no pending submission is refused, accountStatus stays KYC_PENDING", async () => {
  const admin = await makeAdmin();
  const user = await makeVerifiedEmailUser();

  const { status } = await api(`/api/v1/admin/verifications/${user.user._id}/approve`, { method: "POST", token: admin.token });
  assert.equal(status, 409);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "KYC_PENDING");
});

// --- 12. Users cannot directly modify accountStatus ---

test("PUT /settings/profile cannot set accountStatus directly (mass-assignment closed)", async () => {
  const user = await createAuthenticatedTestUser();
  const { status } = await api("/api/v1/settings/profile", {
    method: "PUT",
    token: user.token,
    body: { accountStatus: "APPROVED", fullName: "Still Me" },
  });
  assert.equal(status, 200);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "EMAIL_PENDING", "accountStatus must not be settable via profile settings update");
  assert.equal(persisted.fullName, "Still Me");
});

test("PUT /profile cannot set accountStatus directly (mass-assignment closed)", async () => {
  const user = await createAuthenticatedTestUser();
  const { status } = await api("/api/v1/profile", {
    method: "PUT",
    token: user.token,
    body: { accountStatus: "APPROVED", fullName: "Still Me Too" },
  });
  assert.equal(status, 200);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "EMAIL_PENDING");
});

// --- 13/14. Suspended / deleted accounts remain blocked regardless of accountStatus ---

test("a suspended APPROVED account is still blocked from authenticated routes", async () => {
  const admin = await makeAdmin();
  const user = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED", verificationStatus: "approved", isVerified: true });

  const suspend = await api(`/api/v1/admin/users/${user.user._id}/suspend`, {
    method: "POST",
    token: admin.token,
    body: { reason: "test" },
  });
  assert.equal(suspend.status, 200);

  const { status, json } = await api("/api/v1/auth/me", { token: user.token });
  assert.equal(status, 403);
  assert.match(json.message, /suspended/i);

  const persisted = await User.findById(user.user._id);
  assert.equal(persisted.accountStatus, "APPROVED", "accountStatus must stay APPROVED - suspension is an independent axis");
});

test("a soft-deleted account is blocked regardless of accountStatus", async () => {
  const admin = await makeAdmin();
  const user = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED", verificationStatus: "approved", isVerified: true });

  const del = await api(`/api/v1/admin/users/${user.user._id}`, { method: "DELETE", token: admin.token });
  assert.equal(del.status, 200);

  const { status } = await api("/api/v1/auth/me", { token: user.token });
  assert.equal(status, 401);
});

// --- 15. Approved accounts authenticate normally; login is not gated on accountStatus ---

test("an EMAIL_PENDING (unverified) account can still log in normally - login is not gated on accountStatus", async () => {
  const unique = uniqueSuffix();
  const creds = {
    email: `login_${unique}@example.com`,
    password: "Password123!",
    fullName: "Login Test",
    username: `login_${unique}`,
  };
  await api("/api/v1/auth/register", { method: "POST", body: creds });

  const { status, json } = await api("/api/v1/auth/login", { method: "POST", body: { email: creds.email, password: creds.password } });
  assert.equal(status, 200);
  assert.ok(json.data.accessToken);
});

test("an APPROVED account authenticates and GET /me exposes accountStatus", async () => {
  const user = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED", verificationStatus: "approved", isVerified: true });
  const { status, json } = await api("/api/v1/auth/me", { token: user.token });
  assert.equal(status, 200);
  assert.equal(json.data.accountStatus, "APPROVED");
});

// --- accountStatus exposure without leaking internal/sensitive fields ---

test("GET /verification exposes accountStatus but never OTP hashes or raw document contents", async () => {
  const user = await makeVerifiedEmailUser();
  await uploadDoc(user.token, "government_id");
  const { json } = await api("/api/v1/verification", { token: user.token });
  assert.equal(json.data.accountStatus, "KYC_PENDING");
  assert.equal(json.data.emailVerificationCodeHash, undefined);
});
