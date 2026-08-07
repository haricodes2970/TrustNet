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
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
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

test("register succeeds with valid fields and does not leak the password hash", async () => {
  const creds = uniqueCreds();
  const { status, json } = await api("/api/v1/auth/register", { method: "POST", body: creds });
  assert.equal(status, 201);
  assert.equal(json.data.user.email, creds.email);
  assert.equal(json.data.user.password, undefined);
  const persisted = await User.findOne({ email: creds.email }).select("+password");
  assert.ok(persisted.password);
  assert.notEqual(persisted.password, creds.password);
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
