// Sensitive-data exposure sweep (Phase 17 final audit). Walks the read
// paths a tester and a frontend actually hit and asserts that no response
// body ever carries a credential, secret, or verification artifact -
// regardless of which serializer produced it. Complements the per-module
// authorization suites, which prove WHO can read a resource; this proves
// WHAT comes back never includes secrets even for an authorized reader.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
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
  const text = await res.text();
  return { status: res.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

// Field names that must never appear as a key anywhere in a response body.
const FORBIDDEN_KEYS = [
  "password",
  "resetPasswordToken",
  "resetPasswordExpires",
  "twoFactorSecret",
  "twoFactorPendingSecret",
  "emailVerificationCodeHash",
  "emailVerificationExpires",
  "emailVerificationAttempts",
];

function findForbiddenKey(value, path = "$") {
  if (value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findForbiddenKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(key)) return `${path}.${key}`;
    const hit = findForbiddenKey(child, `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}

const SECRETS = {
  password: "SuperSecret123!",
  twoFactorSecret: "JBSWY3DPEHPK3PXP",
  resetToken: "a".repeat(64),
  otpHash: "b".repeat(64),
};

async function seedUserWithEverySecret(overrides = {}) {
  const unique = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
  const user = await User.create({
    fullName: "Secret Holder",
    username: `secret_${unique}`,
    email: `secret_${unique}@example.com`,
    password: await bcrypt.hash(SECRETS.password, 12),
    resetPasswordToken: SECRETS.resetToken,
    resetPasswordExpires: new Date(Date.now() + 3600_000),
    twoFactorSecret: SECRETS.twoFactorSecret,
    twoFactorPendingSecret: SECRETS.twoFactorSecret,
    emailVerificationCodeHash: SECRETS.otpHash,
    emailVerificationExpires: new Date(Date.now() + 600_000),
    emailVerified: true,
    accountStatus: "KYC_PENDING",
    ...overrides,
  });
  return user;
}

test("no authenticated self-read endpoint exposes a credential or secret field", async () => {
  const viewer = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "KYC_PENDING" });
  await User.findByIdAndUpdate(viewer.user._id, {
    password: await bcrypt.hash(SECRETS.password, 12),
    resetPasswordToken: SECRETS.resetToken,
    twoFactorSecret: SECRETS.twoFactorSecret,
    emailVerificationCodeHash: SECRETS.otpHash,
  });

  const routes = ["/api/v1/auth/me", "/api/v1/profile", "/api/v1/settings", "/api/v1/verification", "/api/v1/notifications"];

  for (const route of routes) {
    // eslint-disable-next-line no-await-in-loop
    const { status, json, text } = await api(route, { token: viewer.token });
    if (status >= 400) continue; // route-level auth/gating is covered elsewhere
    const leakedKey = findForbiddenKey(json);
    assert.equal(leakedKey, null, `${route} exposed a forbidden field at ${leakedKey}`);
    for (const secret of Object.values(SECRETS)) {
      assert.ok(!text.includes(secret), `${route} echoed a raw secret value`);
    }
  }
});

test("public read paths never expose a credential or secret field", async () => {
  await seedUserWithEverySecret();

  const routes = [
    "/api/v1/search?q=Secret",
    "/api/v1/search?q=Secret&type=users",
    "/api/v1/startups",
    "/api/v1/jobs",
    "/api/v1/service-listings",
    "/api/v1/provider-profiles",
    "/api/v1/posts",
    "/api/v1/communities",
  ];

  for (const route of routes) {
    // eslint-disable-next-line no-await-in-loop
    const { status, json, text } = await api(route);
    if (status >= 400) continue;
    const leakedKey = findForbiddenKey(json);
    assert.equal(leakedKey, null, `${route} exposed a forbidden field at ${leakedKey}`);
    for (const secret of Object.values(SECRETS)) {
      assert.ok(!text.includes(secret), `${route} echoed a raw secret value`);
    }
  }
});

test("the admin user view does not expose credentials either", async () => {
  const admin = await createAuthenticatedTestUser({ role: "admin", emailVerified: true, accountStatus: "APPROVED" });
  const target = await seedUserWithEverySecret();

  const list = await api("/api/v1/admin/users", { token: admin.token });
  if (list.status < 400) {
    assert.equal(findForbiddenKey(list.json), null, "admin user list exposed a forbidden field");
    for (const secret of Object.values(SECRETS)) {
      assert.ok(!list.text.includes(secret), "admin user list echoed a raw secret value");
    }
  }

  const single = await api(`/api/v1/admin/users/${target._id}`, { token: admin.token });
  if (single.status < 400) {
    assert.equal(findForbiddenKey(single.json), null, "admin single-user view exposed a forbidden field");
    for (const secret of Object.values(SECRETS)) {
      assert.ok(!single.text.includes(secret), "admin single-user view echoed a raw secret value");
    }
  }
});

test("login and registration responses never echo the submitted password", async () => {
  const unique = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
  const creds = {
    email: `echo_${unique}@example.com`,
    password: SECRETS.password,
    fullName: "Echo Test",
    username: `echo_${unique}`,
  };

  const registered = await api("/api/v1/auth/register", { method: "POST", body: creds });
  assert.equal(registered.status, 201);
  assert.ok(!registered.text.includes(SECRETS.password), "register echoed the password");
  assert.equal(findForbiddenKey(registered.json), null);

  const login = await api("/api/v1/auth/login", { method: "POST", body: { email: creds.email, password: creds.password } });
  assert.equal(login.status, 200);
  assert.ok(!login.text.includes(SECRETS.password), "login echoed the password");
  assert.equal(findForbiddenKey(login.json), null);
});

test("a suspended or soft-deleted user never surfaces in public search results", async () => {
  const unique = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
  await User.create({ fullName: "Ghost Suspended", username: `ghost_a_${unique}`, email: `ghost_a_${unique}@example.com`, isActive: false });
  await User.create({ fullName: "Ghost Deleted", username: `ghost_b_${unique}`, email: `ghost_b_${unique}@example.com`, deletedAt: new Date() });
  await User.create({ fullName: "Ghost Visible", username: `ghost_c_${unique}`, email: `ghost_c_${unique}@example.com` });

  const { json } = await api("/api/v1/search?q=Ghost&type=users");
  const names = (json.data.users || []).map((u) => u.fullName);
  assert.ok(names.includes("Ghost Visible"), "an active user must still be findable");
  assert.ok(!names.includes("Ghost Suspended"), "a suspended user must not appear in search");
  assert.ok(!names.includes("Ghost Deleted"), "a soft-deleted user must not appear in search");
});
