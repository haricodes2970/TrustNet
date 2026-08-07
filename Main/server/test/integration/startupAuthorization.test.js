// Startup module integration tests. Runs the real Express app over HTTP
// against an in-memory MongoDB instance so route wiring, authenticate/
// optionalAuthenticate/authorize/validate middleware and startupService are
// all actually exercised end to end, not bypassed. Out of scope: file
// uploads (logoUrl/pitchDeckUrl are plain URL strings in this schema, no
// upload endpoint exists for Startup).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const Startup = require("../../src/models/Startup");
const Team = require("../../src/models/Team");

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

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function makeUser(overrides = {}) {
  return createAuthenticatedTestUser({ role: "builder", ...overrides });
}

async function makeAdmin(overrides = {}) {
  return createAuthenticatedTestUser({ role: "admin", ...overrides });
}

let seq = 0;
function uniqueSuffix() {
  seq += 1;
  return `${Date.now().toString(36)}${seq}`;
}

function payload(overrides = {}) {
  const unique = uniqueSuffix();
  return {
    name: `Test Startup ${unique}`,
    slug: `test-startup-${unique}`,
    description: "A".repeat(60),
    category: "Fintech",
    ...overrides,
  };
}

// --- Create ---

test("create rejects an unauthenticated request", async () => {
  const { status } = await api("/api/v1/startups", { method: "POST", body: payload() });
  assert.equal(status, 401);
});

test("create succeeds and forces founder to the authenticated user regardless of client input", async () => {
  const { user, token } = await makeUser();
  const impostor = await makeUser();
  const body = payload({ founder: impostor.user._id.toString() });
  const { status, json } = await api("/api/v1/startups", { method: "POST", token, body });
  assert.equal(status, 201);
  assert.equal(String(json.data.founder), String(user._id));
});

test("create rejects a description shorter than 50 chars (validation)", async () => {
  const { token } = await makeUser();
  const { status } = await api("/api/v1/startups", {
    method: "POST",
    token,
    body: payload({ description: "too short" }),
  });
  assert.equal(status, 400);
});

test("create rejects a duplicate slug with a friendly message, not a raw Mongo error", async () => {
  const { token } = await makeUser();
  const first = payload();
  await api("/api/v1/startups", { method: "POST", token, body: first });

  const other = await makeUser();
  const { status, json } = await api("/api/v1/startups", {
    method: "POST",
    token: other.token,
    body: payload({ slug: first.slug }),
  });
  assert.equal(status, 409);
  assert.match(json.message, /slug is already taken/i);
  assert.doesNotMatch(json.message, /E11000/);
});

test("create rejects a second startup with the same name from the same founder", async () => {
  const { token } = await makeUser();
  const first = payload({ name: "Acme Rockets" });
  await api("/api/v1/startups", { method: "POST", token, body: first });

  const { status, json } = await api("/api/v1/startups", {
    method: "POST",
    token,
    body: payload({ name: "acme rockets" }), // case-insensitive match
  });
  assert.equal(status, 409);
  assert.match(json.message, /already have a startup/i);
});

test("create allows two different founders to use the same startup name", async () => {
  const a = await makeUser();
  const b = await makeUser();
  const first = await api("/api/v1/startups", { method: "POST", token: a.token, body: payload({ name: "Shared Name Co" }) });
  assert.equal(first.status, 201);

  const second = await api("/api/v1/startups", { method: "POST", token: b.token, body: payload({ name: "Shared Name Co" }) });
  assert.equal(second.status, 201);
});

// --- Visibility / concealment ---

test("GET /:id returns a public, active startup to an anonymous caller", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: true }) });
  const { status, json } = await api(`/api/v1/startups/${created.json.data._id}`);
  assert.equal(status, 200);
  assert.equal(json.data.name, created.json.data.name);
});

test("GET /:id conceals a private startup from an anonymous caller (404, not 403)", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload({ isPublic: false }) });
  const { status, json } = await api(`/api/v1/startups/${created.json.data._id}`);
  assert.equal(status, 404);
  assert.equal(json.message, "Startup not found.");
});

test("GET /:id lets the founder see their own private startup", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload({ isPublic: false }) });
  const { status } = await api(`/api/v1/startups/${created.json.data._id}`, { token });
  assert.equal(status, 200);
});

test("GET /:id lets an admin see someone else's private startup", async () => {
  const owner = await makeUser();
  const admin = await makeAdmin();
  const created = await api("/api/v1/startups", { method: "POST", token: owner.token, body: payload({ isPublic: false }) });
  const { status } = await api(`/api/v1/startups/${created.json.data._id}`, { token: admin.token });
  assert.equal(status, 200);
});

test("a draft-status startup (default on create) is concealed from the public even though isPublic defaults true", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload() }); // status defaults to "draft"
  const { status } = await api(`/api/v1/startups/${created.json.data._id}`);
  assert.equal(status, 404);
});

test("GET /slug/:slug applies the same concealment as GET /:id", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload({ isPublic: false }) });
  const bySlug = await api(`/api/v1/startups/slug/${created.json.data.slug}`);
  assert.equal(bySlug.status, 404);
});

test("GET /:id on a malformed id returns 404 with a clean message (no CastError leak)", async () => {
  const { status, json } = await api("/api/v1/startups/not-a-valid-object-id");
  assert.equal(status, 404);
  assert.equal(json.message, "Startup not found.");
});

// --- List / pagination / filtering ---

test("public list only returns active, public, non-suspended startups", async () => {
  const { token } = await makeUser();
  await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: true }) });
  await api("/api/v1/startups", { method: "POST", token, body: payload() }); // draft
  await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: false }) });

  const { status, json } = await api("/api/v1/startups");
  assert.equal(status, 200);
  assert.equal(json.data.length, 1);
});

test("public list supports pagination via flat limit/skip query params (regression: bracket notation silently did nothing under Express 5's default query parser)", async () => {
  const { token } = await makeUser();
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: true }) });
  }
  const page = await api("/api/v1/startups?limit=2&skip=0");
  assert.equal(page.json.data.length, 2);
});

test("public list supports filtering by category via a JSON-encoded filter param", async () => {
  const { token } = await makeUser();
  await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: true, category: "Healthtech" }) });
  await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: true, category: "Fintech" }) });

  const filter = encodeURIComponent(JSON.stringify({ category: "Healthtech" }));
  const { json } = await api(`/api/v1/startups?filter=${filter}`);
  assert.equal(json.data.length, 1);
  assert.equal(json.data[0].category, "Healthtech");
});

// --- getMyStartups ---

test("GET /me rejects unauthenticated and returns only the caller's own, non-deleted startups", async () => {
  const anon = await api("/api/v1/startups/me");
  assert.equal(anon.status, 401);

  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload() });
  await api(`/api/v1/startups/${created.json.data._id}`, { method: "DELETE", token });

  const mine = await api("/api/v1/startups/me", { token });
  assert.equal(mine.status, 200);
  assert.equal(mine.json.data.length, 0);
});

// --- Update ---

test("update rejects a non-owner, non-admin", async () => {
  const owner = await makeUser();
  const other = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token: owner.token, body: payload() });

  const { status } = await api(`/api/v1/startups/${created.json.data._id}`, {
    method: "PUT",
    token: other.token,
    body: { tagline: "hijacked" },
  });
  assert.equal(status, 403);
});

test("update succeeds for the owner and stamps updatedBy", async () => {
  const { user, token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload() });

  const { status, json } = await api(`/api/v1/startups/${created.json.data._id}`, {
    method: "PUT",
    token,
    body: { tagline: "New tagline" },
  });
  assert.equal(status, 200);
  assert.equal(json.data.tagline, "New tagline");
  assert.equal(String(json.data.updatedBy), String(user._id));
});

test("update succeeds for an admin acting on someone else's startup (admin override)", async () => {
  const owner = await makeUser();
  const admin = await makeAdmin();
  const created = await api("/api/v1/startups", { method: "POST", token: owner.token, body: payload() });

  const { status } = await api(`/api/v1/startups/${created.json.data._id}`, {
    method: "PUT",
    token: admin.token,
    body: { tagline: "Admin-edited" },
  });
  assert.equal(status, 200);
});

test("update rejects an invalid stage enum value (validation)", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload() });

  const { status } = await api(`/api/v1/startups/${created.json.data._id}`, {
    method: "PUT",
    token,
    body: { stage: "not-a-real-stage" },
  });
  assert.equal(status, 400);
});

test("update rejects edits to a deleted startup until it is restored", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload() });
  await api(`/api/v1/startups/${created.json.data._id}`, { method: "DELETE", token });

  const { status, json } = await api(`/api/v1/startups/${created.json.data._id}`, {
    method: "PUT",
    token,
    body: { tagline: "should not apply" },
  });
  assert.equal(status, 409);
  assert.match(json.message, /deleted/i);
});

// --- Delete / restore (soft delete, regression) ---

test("delete soft-deletes: the row survives, public visibility disappears, Team references stay valid", async () => {
  const { user, token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: true }) });
  const startupId = created.json.data._id;

  const team = await Team.create({ startup: startupId, name: "Fixture Team", owner: user._id });

  const del = await api(`/api/v1/startups/${startupId}`, { method: "DELETE", token });
  assert.equal(del.status, 200);
  assert.ok(del.json.data.deletedAt);

  // Row still exists (regression: previously findByIdAndDelete removed it
  // entirely, orphaning Team.startup).
  const stillExists = await Startup.findById(startupId).lean();
  assert.ok(stillExists);

  const teamStillValid = await Team.findById(team._id).lean();
  assert.equal(String(teamStillValid.startup), String(startupId));

  // Gone from the public list.
  const publicList = await api("/api/v1/startups");
  assert.ok(!publicList.json.data.some((s) => s._id === startupId));

  // Owner can still fetch it directly (to restore).
  const ownerView = await api(`/api/v1/startups/${startupId}`, { token });
  assert.equal(ownerView.status, 200);
});

test("delete rejects a non-owner, non-admin", async () => {
  const owner = await makeUser();
  const other = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token: owner.token, body: payload() });

  const { status } = await api(`/api/v1/startups/${created.json.data._id}`, { method: "DELETE", token: other.token });
  assert.equal(status, 403);
});

test("restore reverses a soft delete and is available to the owner", async () => {
  const { token } = await makeUser();
  const created = await api("/api/v1/startups", { method: "POST", token, body: payload({ status: "active", isPublic: true }) });
  const startupId = created.json.data._id;

  await api(`/api/v1/startups/${startupId}`, { method: "DELETE", token });
  const restore = await api(`/api/v1/startups/${startupId}/restore`, { method: "POST", token });
  assert.equal(restore.status, 200);
  assert.equal(restore.json.data.deletedAt, null);

  const publicList = await api("/api/v1/startups");
  assert.ok(publicList.json.data.some((s) => s._id === startupId));
});

test("restore succeeds for an admin acting on someone else's deleted startup (admin override)", async () => {
  const owner = await makeUser();
  const admin = await makeAdmin();
  const created = await api("/api/v1/startups", { method: "POST", token: owner.token, body: payload() });
  await api(`/api/v1/startups/${created.json.data._id}`, { method: "DELETE", token: owner.token });

  const { status } = await api(`/api/v1/startups/${created.json.data._id}/restore`, { method: "POST", token: admin.token });
  assert.equal(status, 200);
});

// --- Search exclusion (regression) ---

test("global search excludes private and non-active startups", async () => {
  const { token } = await makeUser();
  await api("/api/v1/startups", { method: "POST", token, body: payload({ name: "Searchable Public Co", status: "active", isPublic: true }) });
  await api("/api/v1/startups", { method: "POST", token, body: payload({ name: "Searchable Private Co", isPublic: false }) });

  const { status, json } = await api("/api/v1/search?q=Searchable");
  assert.equal(status, 200);
  assert.equal(json.data.startups.length, 1);
  assert.equal(json.data.startups[0].name, "Searchable Public Co");
});
