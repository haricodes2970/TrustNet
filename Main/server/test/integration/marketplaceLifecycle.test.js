// ProviderProfile + ServiceListing + EngagementRequest integration tests
// (Marketplace phase). Runs the real Express app over HTTP against an
// in-memory MongoDB instance. Complements the existing thorough
// service-level marketplaceAuthorization.test.js — this file exercises
// routes/controllers/validators plus everything added this phase: platform-
// admin override, ServiceListing restore, duplicate-title validation, and
// the provider-account-state / startup-state guards.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const app = require("../../app");
const User = require("../../src/models/User");
const Startup = require("../../src/models/Startup");
const ServiceListing = require("../../src/models/ServiceListing");

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

async function activateStartup(startupId) {
  await Startup.findByIdAndUpdate(startupId, { status: "active" });
}

async function createProviderWithPublishedListing() {
  const provider = await createAuthenticatedTestUser();
  const profile = await api("/api/v1/provider-profiles", {
    method: "POST",
    token: provider.token,
    body: { businessName: "Acme Consulting" },
  });
  const listing = await api("/api/v1/service-listings", {
    method: "POST",
    token: provider.token,
    body: { title: "Brand Strategy", category: "Marketing", description: "Full brand overhaul.", pricingModel: "fixed" },
  });
  const published = await api(`/api/v1/service-listings/${listing.json.data._id}/publish`, {
    method: "PUT",
    token: provider.token,
  });
  return { provider, profile: profile.json.data, listing: published.json.data };
}

// --- ProviderProfile ---

test("create profile succeeds, duplicate is rejected 409", async () => {
  const provider = await createAuthenticatedTestUser();
  const first = await api("/api/v1/provider-profiles", { method: "POST", token: provider.token, body: { businessName: "Acme" } });
  assert.equal(first.status, 201);

  const dup = await api("/api/v1/provider-profiles", { method: "POST", token: provider.token, body: { businessName: "Acme II" } });
  assert.equal(dup.status, 409);
});

test("update: owner can edit own profile, another user cannot, platform admin can", async () => {
  const provider = await createAuthenticatedTestUser();
  const other = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const created = await api("/api/v1/provider-profiles", { method: "POST", token: provider.token, body: { businessName: "Original" } });
  const id = created.json.data._id;

  const byOwner = await api(`/api/v1/provider-profiles/${id}`, { method: "PUT", token: provider.token, body: { businessName: "Updated" } });
  assert.equal(byOwner.status, 200);

  const byOther = await api(`/api/v1/provider-profiles/${id}`, { method: "PUT", token: other.token, body: { businessName: "Hijacked" } });
  assert.equal(byOther.status, 403);

  const byAdmin = await api(`/api/v1/provider-profiles/${id}`, { method: "PUT", token: admin.token, body: { businessName: "Admin Edited" } });
  assert.equal(byAdmin.status, 200);
});

test("get exposes a verification field sourced from the linked User", async () => {
  const provider = await createAuthenticatedTestUser();
  const created = await api("/api/v1/provider-profiles", { method: "POST", token: provider.token, body: { businessName: "Acme" } });

  const { status, json } = await api(`/api/v1/provider-profiles/${created.json.data._id}`);
  assert.equal(status, 200);
  assert.ok("verification" in json.data);
  assert.equal(json.data.verification.isVerified, false);
});

test("a suspended provider's profile is concealed from the public directory and get; admin still sees it", async () => {
  const provider = await createAuthenticatedTestUser();
  const admin = await makeAdmin();
  const created = await api("/api/v1/provider-profiles", { method: "POST", token: provider.token, body: { businessName: "Acme" } });
  const id = created.json.data._id;

  await User.findByIdAndUpdate(provider.user._id, { isActive: false });

  const publicList = await api("/api/v1/provider-profiles");
  assert.ok(!publicList.json.data.some((p) => p._id === id));

  const publicGet = await api(`/api/v1/provider-profiles/${id}`);
  assert.equal(publicGet.status, 404);

  // optionalAuthenticate treats a suspended account's own token as
  // anonymous (mirrors hard `authenticate`'s 403 for the same case) - the
  // now-suspended owner can no longer prove their own identity through this
  // public route either, same 404 as any other visitor.
  const ownerGet = await api(`/api/v1/provider-profiles/${id}`, { token: provider.token });
  assert.equal(ownerGet.status, 404);

  const adminGet = await api(`/api/v1/provider-profiles/${id}`, { token: admin.token });
  assert.equal(adminGet.status, 200);
});

// --- ServiceListing ---

test("create rejects without a provider profile, and rejects a duplicate active title", async () => {
  const user = await createAuthenticatedTestUser();
  const noProfile = await api("/api/v1/service-listings", { method: "POST", token: user.token, body: { title: "No Profile Yet", category: "Y" } });
  assert.equal(noProfile.status, 409);

  await api("/api/v1/provider-profiles", { method: "POST", token: user.token, body: { businessName: "Acme" } });
  const first = await api("/api/v1/service-listings", { method: "POST", token: user.token, body: { title: "Brand Strategy", category: "Marketing" } });
  assert.equal(first.status, 201);

  const dup = await api("/api/v1/service-listings", { method: "POST", token: user.token, body: { title: "brand strategy", category: "Marketing" } });
  assert.equal(dup.status, 409);
});

test("archive then restore round-trips; platform admin can restore on the owner's behalf", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const admin = await makeAdmin();

  const archived = await api(`/api/v1/service-listings/${listing._id}`, { method: "DELETE", token: provider.token });
  assert.equal(archived.status, 200);
  assert.equal(archived.json.data.isArchived, true);

  const restored = await api(`/api/v1/service-listings/${listing._id}/restore`, { method: "POST", token: provider.token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.data.isArchived, false);

  await api(`/api/v1/service-listings/${listing._id}`, { method: "DELETE", token: provider.token });
  const adminRestored = await api(`/api/v1/service-listings/${listing._id}/restore`, { method: "POST", token: admin.token });
  assert.equal(adminRestored.status, 200);
});

test("owner cannot self-restore a listing removed via admin moderation; admin still can", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const admin = await makeAdmin();
  await ServiceListing.findByIdAndUpdate(listing._id, { deletedAt: new Date(), isArchived: true });

  const ownerRestore = await api(`/api/v1/service-listings/${listing._id}/restore`, { method: "POST", token: provider.token });
  assert.equal(ownerRestore.status, 409);

  const adminRestore = await api(`/api/v1/service-listings/${listing._id}/restore`, { method: "POST", token: admin.token });
  assert.equal(adminRestore.status, 200);
});

test("platform admin can update/archive a listing it does not own", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const admin = await makeAdmin();

  const updated = await api(`/api/v1/service-listings/${listing._id}`, { method: "PUT", token: admin.token, body: { title: "Admin Renamed" } });
  assert.equal(updated.status, 200);

  const archived = await api(`/api/v1/service-listings/${listing._id}`, { method: "DELETE", token: admin.token });
  assert.equal(archived.status, 200);
});

test("a listing from a suspended provider is hidden from public view and list, but visible to admin", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const admin = await makeAdmin();

  await User.findByIdAndUpdate(provider.user._id, { isActive: false });

  const publicGet = await api(`/api/v1/service-listings/${listing._id}`);
  assert.equal(publicGet.status, 404);

  const publicList = await api("/api/v1/service-listings");
  assert.ok(!publicList.json.data.some((l) => l._id === listing._id));

  const adminGet = await api(`/api/v1/service-listings/${listing._id}`, { token: admin.token });
  assert.equal(adminGet.status, 200);
});

test("list supports search on title", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const { json } = await api("/api/v1/service-listings?search=brand");
  assert.ok(json.data.some((l) => l._id === listing._id));

  const miss = await api("/api/v1/service-listings?search=nonexistentterm");
  assert.equal(miss.json.data.length, 0);
});

// --- EngagementRequest ---

test("create rejects against an inactive, suspended, or deleted startup", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();

  const draftBlocked = await api("/api/v1/engagement-requests", {
    method: "POST",
    token: fx.founder.token,
    body: { serviceListingId: listing._id, startupId: fx.startup._id },
  });
  assert.equal(draftBlocked.status, 409);

  await activateStartup(fx.startup._id);
  const ok = await api("/api/v1/engagement-requests", {
    method: "POST",
    token: fx.founder.token,
    body: { serviceListingId: listing._id, startupId: fx.startup._id },
  });
  assert.equal(ok.status, 201);

  await api(`/api/v1/engagement-requests/${ok.json.data._id}/cancel`, { method: "PUT", token: fx.founder.token });

  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: true });
  const suspended = await api("/api/v1/engagement-requests", {
    method: "POST",
    token: fx.founder.token,
    body: { serviceListingId: listing._id, startupId: fx.startup._id },
  });
  assert.equal(suspended.status, 409);

  await Startup.findByIdAndUpdate(fx.startup._id, { isSuspended: false, deletedAt: new Date() });
  const deleted = await api("/api/v1/engagement-requests", {
    method: "POST",
    token: fx.founder.token,
    body: { serviceListingId: listing._id, startupId: fx.startup._id },
  });
  assert.equal(deleted.status, 409);
});

test("create rejects when the listing's provider account is suspended", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);

  await User.findByIdAndUpdate(provider.user._id, { isActive: false });

  const { status } = await api("/api/v1/engagement-requests", {
    method: "POST",
    token: fx.founder.token,
    body: { serviceListingId: listing._id, startupId: fx.startup._id },
  });
  assert.equal(status, 409);
});

test("platform admin can advance status and cancel a request it has no direct role on", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  await activateStartup(fx.startup._id);
  const admin = await makeAdmin();

  const created = await api("/api/v1/engagement-requests", {
    method: "POST",
    token: fx.founder.token,
    body: { serviceListingId: listing._id, startupId: fx.startup._id },
  });
  const id = created.json.data._id;

  const byAdmin = await api(`/api/v1/engagement-requests/${id}/status`, { method: "PUT", token: admin.token, body: { status: "accepted" } });
  assert.equal(byAdmin.status, 200);

  const cancelled = await api(`/api/v1/engagement-requests/${id}/cancel`, { method: "PUT", token: admin.token });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.json.data.status, "cancelled");
});

test("list supports pagination via flat limit/skip", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fxA = await createStartupTeamFixture();
  const fxB = await createStartupTeamFixture();
  await activateStartup(fxA.startup._id);
  await activateStartup(fxB.startup._id);
  await api("/api/v1/engagement-requests", { method: "POST", token: fxA.founder.token, body: { serviceListingId: listing._id, startupId: fxA.startup._id } });
  await api("/api/v1/engagement-requests", { method: "POST", token: fxB.founder.token, body: { serviceListingId: listing._id, startupId: fxB.startup._id } });

  const { json } = await api(`/api/v1/engagement-requests?serviceListingId=${listing._id}&limit=1&skip=0`, { token: fxA.founder.token });
  assert.equal(json.data.length, 1);
});
