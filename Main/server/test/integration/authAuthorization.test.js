// Auth module integration tests. Runs the real Express app (app.js) over
// HTTP against an in-memory MongoDB instance so route-level logic (auth
// logic lives directly in routes/auth.routes.js, not a service) is actually
// exercised, not bypassed. Out of scope: OAuth (Google/LinkedIn — requires
// live provider calls), actual email delivery (SMTP is configured in this
// repo's .env; tests must never trigger a real send), full 2FA
// setup/enable/disable happy path (covered indirectly via the /login/2fa
// rejection + rate-limit test below).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const app = require("../../app");
const User = require("../../src/models/User");
const emailService = require("../../src/services/email.service");

let server;
let baseUrl;

// Monkey-patch + restore, same technique aiService's own tests use for
// aiProviderService.generateCompletion - required because /register now
// unconditionally issues and emails an OTP (Phase 16A). Without this,
// every register-flow test in this file would attempt a real SMTP send
// (this repo's .env carries live SMTP credentials, per the file header
// note above) instead of a mock. sentOtps lets the new OTP tests below
// assert on exactly what would have been emailed, without ever touching
// a real inbox.
let sentOtps = [];
const originalSendOtpVerificationEmail = emailService.sendOtpVerificationEmail;

before(async () => {
  await setupTestDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  emailService.sendOtpVerificationEmail = async ({ to, otp, expiresInMinutes }) => {
    sentOtps.push({ to, otp, expiresInMinutes });
  };
});

after(async () => {
  emailService.sendOtpVerificationEmail = originalSendOtpVerificationEmail;
  await new Promise((resolve) => server.close(resolve));
  await teardownTestDB();
});

beforeEach(async () => {
  sentOtps = [];
  await clearDatabase();
});

function lastOtpFor(email) {
  const matches = sentOtps.filter((entry) => entry.to === email);
  return matches[matches.length - 1];
}

function getSetCookie(res, name) {
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  return match ? match.split(";")[0] : null;
}

async function api(path, { method = "GET", body, token, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, res };
}

let seq = 0;
function uniqueSuffix() {
  seq += 1;
  return `${Date.now().toString(36)}${seq}`;
}

function uniqueCreds(overrides = {}) {
  const unique = uniqueSuffix();
  return {
    email: `auth_${unique}@example.com`,
    password: "Password123!",
    fullName: "Auth Test",
    username: `auth_${unique}`,
    ...overrides,
  };
}

// Registration itself is rate limited (5/hour/IP — see rateLimits.js). Tests
// that only need *a* logged-in user, not registration behavior, create the
// user directly (bypassing the limiter) and log in for real, so the
// signup limiter's quota is reserved for the register-specific tests below.
async function createDirectUser(overrides = {}) {
  const creds = uniqueCreds(overrides);
  await User.create({
    email: creds.email,
    password: await bcrypt.hash(creds.password, 12),
    fullName: creds.fullName,
    username: creds.username,
  });
  return creds;
}

// Bypasses /register (and its 5/hour signup limiter) the same way
// createDirectUser does - most OTP tests only need "an unverified account
// with a known OTP," not registration behavior itself, which has its own
// dedicated end-to-end test below.
async function createUnverifiedUser(otp = "123456", overrides = {}) {
  const creds = uniqueCreds(overrides);
  const user = await User.create({
    email: creds.email,
    password: await bcrypt.hash(creds.password, 12),
    fullName: creds.fullName,
    username: creds.username,
    emailVerificationCodeHash: crypto.createHash("sha256").update(otp).digest("hex"),
    emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
    emailVerificationAttempts: 0,
  });
  return { creds, user, otp };
}

async function loginAs(creds) {
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: creds.email, password: creds.password },
  });
  assert.equal(login.status, 200);
  const refreshCookie = getSetCookie(login.res, "trustnet_refresh");
  return { accessToken: login.json.data.accessToken, refreshCookie };
}

async function registerAndLogin(overrides = {}) {
  const creds = await createDirectUser(overrides);
  const { accessToken, refreshCookie } = await loginAs(creds);
  return { creds, accessToken, refreshCookie };
}

// --- Register ---

test("register succeeds with valid fields, does not leak the password hash, and issues+emails an OTP for an unverified account (Phase 16A)", async () => {
  const creds = uniqueCreds();
  const { status, json } = await api("/api/v1/auth/register", { method: "POST", body: creds });
  assert.equal(status, 201);
  assert.equal(json.data.user.email, creds.email);
  assert.equal(json.data.user.password, undefined);
  assert.equal(json.data.user.emailVerified, false);

  const persisted = await User.findOne({ email: creds.email }).select(
    "+password +emailVerificationCodeHash +emailVerificationExpires +emailVerificationAttempts"
  );
  assert.ok(persisted.password);
  assert.notEqual(persisted.password, creds.password);
  assert.equal(persisted.emailVerified, false);
  assert.ok(persisted.emailVerificationCodeHash, "expected an OTP hash to be persisted");
  assert.ok(persisted.emailVerificationExpires > new Date(), "expected a future expiry");
  assert.equal(persisted.emailVerificationAttempts, 0);

  const sent = lastOtpFor(creds.email);
  assert.ok(sent, "expected an OTP email to have been sent to the registered address");
  assert.match(sent.otp, /^\d{6}$/);
  assert.equal(sent.expiresInMinutes, 10);
  // The stored hash must match a sha256 of the plaintext OTP that was
  // actually emailed - proves the same code that reached the inbox is the
  // one that will verify successfully, not two independently generated
  // values.
  assert.equal(persisted.emailVerificationCodeHash, crypto.createHash("sha256").update(sent.otp).digest("hex"));

  // Never returned in the API response body itself.
  assert.doesNotMatch(JSON.stringify(json), new RegExp(sent.otp));
});

test("register rejects missing email/password", async () => {
  const { status, json } = await api("/api/v1/auth/register", { method: "POST", body: { email: "" } });
  assert.equal(status, 400);
  assert.equal(json.success, false);
});

test("register rejects a duplicate email with a clear message", async () => {
  const creds = uniqueCreds();
  await User.create({ email: creds.email, password: "irrelevant", fullName: "Seed User", username: `seed_${uniqueSuffix()}` });
  const { status, json } = await api("/api/v1/auth/register", { method: "POST", body: creds });
  assert.equal(status, 409);
  assert.match(json.message, /email/i);
});

test("register rejects a duplicate username with a username-specific message (not the email message)", async () => {
  const taken = uniqueCreds();
  await User.create({ email: `seed_${uniqueSuffix()}@example.com`, password: "irrelevant", fullName: "Seed User", username: taken.username });

  const attempt = uniqueCreds({ username: taken.username });
  const { status, json } = await api("/api/v1/auth/register", { method: "POST", body: attempt });
  assert.equal(status, 409);
  assert.match(json.message, /username/i);
  assert.doesNotMatch(json.message, /email already exists/i);
});

// --- Login ---

test("login rejects an unknown email with a generic message", async () => {
  const { status, json } = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: "nobody@example.com", password: "whatever" },
  });
  assert.equal(status, 401);
  assert.match(json.message, /invalid email or password/i);
});

test("login rejects a wrong password", async () => {
  const creds = uniqueCreds();
  await api("/api/v1/auth/register", { method: "POST", body: creds });
  const { status } = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email: creds.email, password: "wrong-password" },
  });
  assert.equal(status, 401);
});

test("login succeeds and issues an access token plus a refresh cookie", async () => {
  const { accessToken, refreshCookie } = await registerAndLogin();
  assert.ok(accessToken);
  assert.ok(refreshCookie);
});

// --- authenticate middleware / /me (regression: broken refresh-cookie fallback) ---

test("GET /me succeeds with a valid Bearer access token", async () => {
  const { accessToken, creds } = await registerAndLogin();
  const { status, json } = await api("/api/v1/auth/me", { token: accessToken });
  assert.equal(status, 200);
  assert.equal(json.data.email, creds.email);
});

test("GET /me rejects with no token at all", async () => {
  const { status } = await api("/api/v1/auth/me");
  assert.equal(status, 401);
});

test("GET /me rejects a refresh cookie presented with no Bearer header (fallback must not authenticate)", async () => {
  const { refreshCookie } = await registerAndLogin();
  const { status, json } = await api("/api/v1/auth/me", { cookie: refreshCookie });
  assert.equal(status, 401);
  assert.match(json.message, /token is missing/i);
});

// --- Refresh + logout revocation ---

test("refresh succeeds with a valid refresh cookie and rotates it", async () => {
  const { refreshCookie } = await registerAndLogin();
  const first = await api("/api/v1/auth/refresh", { method: "POST", cookie: refreshCookie });
  assert.equal(first.status, 200);
  const rotatedCookie = getSetCookie(first.res, "trustnet_refresh");
  assert.ok(rotatedCookie);

  const second = await api("/api/v1/auth/refresh", { method: "POST", cookie: rotatedCookie });
  assert.equal(second.status, 200);
});

test("refresh rejects when no cookie is sent", async () => {
  const { status } = await api("/api/v1/auth/refresh", { method: "POST" });
  assert.equal(status, 401);
});

test("logout revokes the refresh token server-side — a captured pre-logout cookie stops working (regression)", async () => {
  const { refreshCookie } = await registerAndLogin();

  const logout = await api("/api/v1/auth/logout", { method: "POST", cookie: refreshCookie });
  assert.equal(logout.status, 200);

  const reuse = await api("/api/v1/auth/refresh", { method: "POST", cookie: refreshCookie });
  assert.equal(reuse.status, 401);
});

test("logout with no cookie present does not error", async () => {
  const { status, json } = await api("/api/v1/auth/logout", { method: "POST" });
  assert.equal(status, 200);
  assert.equal(json.success, true);
});

// --- Password change / reset revoke sessions (regression) ---

test("change-password rejects an incorrect current password", async () => {
  const { accessToken } = await registerAndLogin();
  const { status } = await api("/api/v1/auth/change-password", {
    method: "PUT",
    token: accessToken,
    body: { currentPassword: "wrong", newPassword: "NewPassword123", confirmPassword: "NewPassword123" },
  });
  assert.equal(status, 400);
});

test("change-password succeeds and revokes prior refresh tokens (regression)", async () => {
  const { creds, accessToken, refreshCookie } = await registerAndLogin();
  const changed = await api("/api/v1/auth/change-password", {
    method: "PUT",
    token: accessToken,
    body: { currentPassword: creds.password, newPassword: "NewPassword123", confirmPassword: "NewPassword123" },
  });
  assert.equal(changed.status, 200);

  const reuse = await api("/api/v1/auth/refresh", { method: "POST", cookie: refreshCookie });
  assert.equal(reuse.status, 401);

  // Confirm the new password was actually persisted, without spending another
  // /login call against the shared login rate limiter.
  const persisted = await User.findOne({ email: creds.email }).select("+password");
  assert.ok(await bcrypt.compare("NewPassword123", persisted.password));
});

// --- Forgot password (no real SMTP call — only the pre-send branches) ---

test("forgot-password rejects an invalid email format", async () => {
  const { status } = await api("/api/v1/auth/forgot-password", { method: "POST", body: { email: "not-an-email" } });
  assert.equal(status, 400);
});

test("forgot-password returns a generic success message for an unknown email (no email attempted, no enumeration)", async () => {
  const { status, json } = await api("/api/v1/auth/forgot-password", {
    method: "POST",
    body: { email: "nobody@example.com" },
  });
  assert.equal(status, 200);
  assert.match(json.message, /if an account exists/i);
});

// --- Rate limiting wiring (regression: previously unthrottled endpoints) ---

test("login/2fa is rate limited after repeated invalid attempts (regression)", async () => {
  const results = [];
  for (let i = 0; i < 11; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { status } = await api("/api/v1/auth/login/2fa", {
      method: "POST",
      body: { twoFactorToken: "not-a-real-token", token: "000000" },
    });
    results.push(status);
  }
  assert.ok(results.slice(0, 10).every((s) => s === 401), `expected first 10 to be 401, got ${results}`);
  assert.equal(results[10], 429, `expected 11th attempt to be rate limited, got ${results}`);
});

test("change-password is rate limited after repeated failed attempts (regression)", async () => {
  const { accessToken } = await registerAndLogin();
  const results = [];
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { status } = await api("/api/v1/auth/change-password", {
      method: "PUT",
      token: accessToken,
      body: { currentPassword: "wrong", newPassword: "NewPassword123", confirmPassword: "NewPassword123" },
    });
    results.push(status);
  }
  assert.ok(results.slice(0, 5).every((s) => s === 400), `expected first 5 to be 400, got ${results}`);
  assert.equal(results[5], 429, `expected 6th attempt to be rate limited, got ${results}`);
});

// --- Email OTP verification (Phase 16A) ---

test("verify-email: correct OTP verifies the email exactly once", async () => {
  const { creds, otp } = await createUnverifiedUser();
  const { status, json } = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: creds.email, otp },
  });
  assert.equal(status, 200);
  assert.equal(json.data.user.emailVerified, true);

  const persisted = await User.findOne({ email: creds.email }).select("+emailVerificationCodeHash +emailVerificationExpires");
  assert.equal(persisted.emailVerified, true);
  assert.ok(persisted.emailVerifiedAt);
  assert.equal(persisted.emailVerificationCodeHash, undefined);
  assert.equal(persisted.emailVerificationExpires, undefined);
});

test("verify-email: malformed OTP (not 6 digits) is rejected without a database lookup", async () => {
  const { creds } = await createUnverifiedUser();
  const { status, json } = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: creds.email, otp: "12" },
  });
  assert.equal(status, 400);
  assert.match(json.message, /invalid or expired/i);
});

test("verify-email: incorrect OTP is rejected with the same generic message as a non-existent account", async () => {
  const { creds } = await createUnverifiedUser("123456");
  const wrong = await api("/api/v1/auth/verify-email", { method: "POST", body: { email: creds.email, otp: "999999" } });
  const noAccount = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: "nobody-at-all@example.com", otp: "999999" },
  });
  assert.equal(wrong.status, 400);
  assert.equal(noAccount.status, 400);
  assert.equal(wrong.json.message, noAccount.json.message);

  const persisted = await User.findOne({ email: creds.email });
  assert.equal(persisted.emailVerified, false);
});

test("verify-email: expired OTP is rejected", async () => {
  const { creds, user, otp } = await createUnverifiedUser();
  await User.findByIdAndUpdate(user._id, { emailVerificationExpires: new Date(Date.now() - 1000) });
  const { status } = await api("/api/v1/auth/verify-email", { method: "POST", body: { email: creds.email, otp } });
  assert.equal(status, 400);
});

test("verify-email: an already-verified account returns a distinct message and cannot be re-verified", async () => {
  const { creds, user } = await createUnverifiedUser();
  await User.findByIdAndUpdate(user._id, { emailVerified: true, emailVerifiedAt: new Date() });
  const { status, json } = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: creds.email, otp: "000000" },
  });
  assert.equal(status, 200);
  assert.match(json.message, /already verified/i);
});

test("verify-email: a used OTP cannot be reused for a second verification", async () => {
  const { creds, otp } = await createUnverifiedUser();
  const first = await api("/api/v1/auth/verify-email", { method: "POST", body: { email: creds.email, otp } });
  assert.equal(first.status, 200);
  const firstVerifiedAt = first.json.data.user.emailVerifiedAt;

  const secondAttempt = await api("/api/v1/auth/verify-email", { method: "POST", body: { email: creds.email, otp } });
  assert.equal(secondAttempt.status, 200);
  assert.match(secondAttempt.json.message, /already verified/i);

  // Re-submitting the same OTP did not re-run verification or move the
  // original verification timestamp.
  const persisted = await User.findOne({ email: creds.email });
  assert.equal(new Date(persisted.emailVerifiedAt).getTime(), new Date(firstVerifiedAt).getTime());
});

test("verify-email: cannot verify one account using another account's OTP (cross-account rejection)", async () => {
  const accountA = await createUnverifiedUser("111111");
  const accountB = await createUnverifiedUser("222222");

  const crossAttempt = await api("/api/v1/auth/verify-email", {
    method: "POST",
    body: { email: accountA.creds.email, otp: accountB.otp },
  });
  assert.equal(crossAttempt.status, 400);

  const persistedA = await User.findOne({ email: accountA.creds.email });
  assert.equal(persistedA.emailVerified, false);
});

test("resend-verification: issues a new OTP that invalidates the previous one, and is enumeration-safe", async () => {
  const { creds, otp: originalOtp } = await createUnverifiedUser();

  const resend = await api("/api/v1/auth/resend-verification", { method: "POST", body: { email: creds.email } });
  assert.equal(resend.status, 200);
  assert.match(resend.json.message, /if an account exists/i);

  const newSent = lastOtpFor(creds.email);
  assert.ok(newSent);
  assert.notEqual(newSent.otp, originalOtp);

  const oldOtpAttempt = await api("/api/v1/auth/verify-email", { method: "POST", body: { email: creds.email, otp: originalOtp } });
  assert.equal(oldOtpAttempt.status, 400);

  const newOtpAttempt = await api("/api/v1/auth/verify-email", { method: "POST", body: { email: creds.email, otp: newSent.otp } });
  assert.equal(newOtpAttempt.status, 200);
});

test("resend-verification: returns the same generic message for a non-existent email and an already-verified account (no enumeration)", async () => {
  const { creds: verifiedCreds, user: verifiedUser } = await createUnverifiedUser();
  await User.findByIdAndUpdate(verifiedUser._id, { emailVerified: true, emailVerifiedAt: new Date() });

  const forVerified = await api("/api/v1/auth/resend-verification", { method: "POST", body: { email: verifiedCreds.email } });
  const forUnknown = await api("/api/v1/auth/resend-verification", { method: "POST", body: { email: "no-such-account@example.com" } });

  assert.equal(forVerified.status, 200);
  assert.equal(forUnknown.status, 200);
  assert.equal(forVerified.json.message, forUnknown.json.message);
  assert.equal(lastOtpFor(verifiedCreds.email), undefined, "an already-verified account must not receive a new OTP");
});

test("OTP delivery failures are logged without ever including the plaintext OTP", async () => {
  const originalConsoleError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(" "));
  const originalMock = emailService.sendOtpVerificationEmail;
  emailService.sendOtpVerificationEmail = async () => {
    throw new Error("SMTP connection refused");
  };

  try {
    // Routed through resend-verification rather than register - register
    // shares a much tighter, more security-sensitive limiter
    // (signupLimiter, 5/hour) already exercised by this file's other
    // register tests; both endpoints call the same issueEmailVerificationOtp
    // helper, so this exercises the identical failure-logging code path.
    // Positioned before the dedicated resend-verification rate-limit test
    // below so it still has budget left in the shared window.
    const { creds } = await createUnverifiedUser();
    const { status } = await api("/api/v1/auth/resend-verification", { method: "POST", body: { email: creds.email } });
    assert.equal(status, 200);

    const persisted = await User.findOne({ email: creds.email }).select("+emailVerificationCodeHash");
    assert.ok(persisted.emailVerificationCodeHash, "the OTP must still be persisted for a later resend attempt");

    const otpHash = persisted.emailVerificationCodeHash;
    const combinedLogs = logged.join("\n");
    assert.match(combinedLogs, /Failed to send verification OTP/i);
    // Nothing in the captured log output is the raw hash either (belt and
    // suspenders - the code never has the plaintext OTP in scope inside
    // the catch block at all, only emailError.message).
    assert.doesNotMatch(combinedLogs, new RegExp(otpHash));
  } finally {
    console.error = originalConsoleError;
    emailService.sendOtpVerificationEmail = originalMock;
  }
});

test("resend-verification is rate limited after repeated requests (regression: previously a no-op stub)", async () => {
  // Deliberately not an exact "first N succeed, N+1 is 429" assertion like
  // the pre-existing login/2fa/change-password rate-limit tests: those are
  // the *only* callers of their limiter in this file, so they can rely on
  // starting from a fresh window. resendVerificationLimiter's window is
  // shared with the correctness tests above it in this same file/process
  // (express-rate-limit's store is in-memory per process, not reset
  // between tests), so this only asserts the limiter is reachable at all
  // and does eventually kick in - robust to that shared budget regardless
  // of exactly how much the earlier tests already consumed.
  const { creds } = await createUnverifiedUser();
  const results = [];
  for (let i = 0; i < 8; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { status } = await api("/api/v1/auth/resend-verification", { method: "POST", body: { email: creds.email } });
    results.push(status);
  }
  assert.ok(results.includes(200), `expected at least one 200 among ${results}`);
  assert.ok(results.includes(429), `expected at least one 429 among ${results}`);
});

test("verify-email: brute-force protection locks out further attempts, then the IP rate limiter takes over", async () => {
  // Same "shared budget, don't assert an exact boundary" reasoning as the
  // resend-verification rate-limit test above.
  const { creds } = await createUnverifiedUser();
  const results = [];
  for (let i = 0; i < 15; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { status } = await api("/api/v1/auth/verify-email", {
      method: "POST",
      body: { email: creds.email, otp: "000001" },
    });
    results.push(status);
  }
  assert.ok(results.includes(400), `expected at least one 400 (wrong OTP / locked out) among ${results}`);
  assert.ok(results.includes(429), `expected at least one 429 among ${results}`);

  // Even the CORRECT OTP is now rejected - the account is locked out until
  // a fresh OTP is issued via resend-verification, not just rate limited
  // at the IP layer.
  const persisted = await User.findOne({ email: creds.email }).select("+emailVerificationAttempts");
  assert.ok(persisted.emailVerificationAttempts >= 5, `expected attempts to have reached the lockout threshold, got ${persisted.emailVerificationAttempts}`);
});
