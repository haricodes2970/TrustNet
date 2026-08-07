// Search + Recommendations integration tests (Search + Recommendations
// hardening phase). Runs the real Express app over HTTP against an
// in-memory MongoDB instance. Both modules had zero test coverage before
// this phase. Fixtures are built directly via Mongoose models (these are
// read-only discovery endpoints over data owned by other, already-hardened
// modules - no need to round-trip through every module's own HTTP API).

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const User = require("../../src/models/User");
const Startup = require("../../src/models/Startup");
const Community = require("../../src/models/Community");
const Post = require("../../src/models/Post");
const ProviderProfile = require("../../src/models/ProviderProfile");
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

async function api(pathName, { method = "GET", token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${pathName}`, { method, headers });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function unique(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function makeStartup(founder, overrides = {}) {
  const slug = unique("acme");
  return Startup.create({
    founder: founder.user._id,
    name: overrides.name || `Acme Rocket ${slug}`,
    slug,
    description: "A".repeat(60),
    category: "SaaS",
    status: "active",
    isPublic: true,
    isSuspended: false,
    ...overrides,
  });
}

async function makeCommunity(owner, overrides = {}) {
  const slug = unique("acme-community");
  return Community.create({
    owner: owner.user._id,
    members: [owner.user._id],
    name: overrides.name || `Acme Builders ${slug}`,
    slug,
    description: "A community for Acme builders.",
    isActive: true,
    isHidden: false,
    ...overrides,
  });
}

async function makePost(author, overrides = {}) {
  return Post.create({
    author: author.user._id,
    content: overrides.content || "Acme rocket launch announcement content.",
    visibility: "public",
    isHidden: false,
    ...overrides,
  });
}

async function makeListing(providerUser, overrides = {}) {
  let profile = await ProviderProfile.findOne({ user: providerUser.user._id });
  if (!profile) {
    profile = await ProviderProfile.create({
      user: providerUser.user._id,
      businessName: unique("Acme Consulting"),
      createdBy: providerUser.user._id,
    });
  }
  return ServiceListing.create({
    provider: profile._id,
    title: overrides.title || `Acme Branding Package ${unique("x")}`,
    category: "Marketing",
    description: "Full brand overhaul for Acme-style startups.",
    pricingModel: "fixed",
    status: "published",
    isArchived: false,
    isHidden: false,
    createdBy: providerUser.user._id,
    ...overrides,
  });
}

// --- Search ---

test("search is public (no token required) and returns empty results for an empty query", async () => {
  const { status, json } = await api("/api/v1/search?q=");
  assert.equal(status, 200);
  assert.deepEqual(json.data, { users: [], startups: [], communities: [], posts: [], listings: [] });
});

test("startup search excludes suspended, private, and deleted startups", async () => {
  const founder = await createAuthenticatedTestUser();
  const visible = await makeStartup(founder, { name: "Acme Visible Rocket" });
  await makeStartup(founder, { name: "Acme Suspended Rocket", isSuspended: true });
  await makeStartup(founder, { name: "Acme Private Rocket", isPublic: false });
  await makeStartup(founder, { name: "Acme Deleted Rocket", deletedAt: new Date() });

  const { json } = await api("/api/v1/search?q=Acme&type=startups");
  assert.equal(json.data.listings.length, 0);
  assert.equal(json.data.startups.length, 1);
  assert.equal(json.data.startups[0]._id, String(visible._id));
});

test("community search excludes hidden/deleted, but includes private communities by design", async () => {
  const owner = await createAuthenticatedTestUser();
  const publicCommunity = await makeCommunity(owner, { name: "Acme Public Circle" });
  const privateCommunity = await makeCommunity(owner, { name: "Acme Private Circle", type: "private" });
  await makeCommunity(owner, { name: "Acme Hidden Circle", isHidden: true });
  await makeCommunity(owner, { name: "Acme Deleted Circle", deletedAt: new Date() });

  const { json } = await api("/api/v1/search?q=Acme&type=communities");
  const ids = json.data.communities.map((c) => c._id);
  assert.ok(ids.includes(String(publicCommunity._id)));
  assert.ok(ids.includes(String(privateCommunity._id)));
  assert.equal(json.data.communities.length, 2);
});

test("post search excludes hidden/deleted/private/community-scoped posts", async () => {
  const author = await createAuthenticatedTestUser();
  const publicPost = await makePost(author, { content: "Acme public announcement" });
  await makePost(author, { content: "Acme private note", visibility: "private" });
  await makePost(author, { content: "Acme community update", visibility: "community" });
  await makePost(author, { content: "Acme hidden post", isHidden: true });
  await makePost(author, { content: "Acme deleted post", deletedAt: new Date() });

  const { json } = await api("/api/v1/search?q=Acme&type=posts");
  assert.equal(json.data.posts.length, 1);
  assert.equal(json.data.posts[0]._id, String(publicPost._id));
});

test("marketplace listing search excludes draft/archived/hidden/deleted listings and listings from a suspended provider", async () => {
  const provider = await createAuthenticatedTestUser();
  const suspendedProvider = await createAuthenticatedTestUser();
  await User.findByIdAndUpdate(suspendedProvider.user._id, { isActive: false });

  const published = await makeListing(provider, { title: "Acme Growth Package" });
  await makeListing(provider, { title: "Acme Draft Package", status: "draft" });
  await makeListing(provider, { title: "Acme Archived Package", isArchived: true });
  await makeListing(provider, { title: "Acme Hidden Package", isHidden: true });
  await makeListing(provider, { title: "Acme Deleted Package", deletedAt: new Date() });
  await makeListing(suspendedProvider, { title: "Acme Suspended-Provider Package" });

  const { json } = await api("/api/v1/search?q=Acme&type=listings");
  assert.equal(json.data.listings.length, 1);
  assert.equal(json.data.listings[0]._id, String(published._id));
});

test("pagination: limit/skip work and an oversized limit is clamped", async () => {
  const founder = await createAuthenticatedTestUser();
  for (let i = 0; i < 5; i += 1) {
    await makeStartup(founder, { name: `Acme Rocket Series ${i}` });
  }

  const page1 = await api("/api/v1/search?q=Acme&type=startups&limit=2&skip=0");
  assert.equal(page1.json.data.startups.length, 2);

  const page2 = await api("/api/v1/search?q=Acme&type=startups&limit=2&skip=2");
  assert.equal(page2.json.data.startups.length, 2);
  assert.notEqual(page1.json.data.startups[0]._id, page2.json.data.startups[0]._id);

  const oversized = await api("/api/v1/search?q=Acme&type=startups&limit=9999");
  assert.equal(oversized.json.data.startups.length, 5); // clamped max is 50, only 5 exist
});

test("search injection: regex metacharacters in the query are treated as a literal substring, not a pattern", async () => {
  const founder = await createAuthenticatedTestUser();
  await makeStartup(founder, { name: "Acme (Rocket) [Labs]" });

  const { status, json } = await api(`/api/v1/search?q=${encodeURIComponent("(Rocket)")}&type=startups`);
  assert.equal(status, 200);
  assert.equal(json.data.startups.length, 1);
});

test("type filter scopes results to a single category", async () => {
  const founder = await createAuthenticatedTestUser();
  await makeStartup(founder, { name: "Acme Only Startup" });
  await makeCommunity(founder, { name: "Acme Only Community" });

  const { json } = await api("/api/v1/search?q=Acme&type=startups");
  assert.equal(json.data.startups.length, 1);
  assert.equal(json.data.communities.length, 0);
});

// --- Recommendations ---

test("requires authentication", async () => {
  const { status } = await api("/api/v1/recommendations");
  assert.equal(status, 401);
});

test("excludes suspended/deleted startups, hidden/deleted communities, hidden/deleted posts, and the caller from user recommendations", async () => {
  const viewer = await createAuthenticatedTestUser();
  const founder = await createAuthenticatedTestUser();

  const visibleStartup = await makeStartup(founder);
  await makeStartup(founder, { isSuspended: true });
  await makeStartup(founder, { deletedAt: new Date() });

  const visibleCommunity = await makeCommunity(founder);
  await makeCommunity(founder, { isHidden: true });
  await makeCommunity(founder, { deletedAt: new Date() });

  const visiblePost = await makePost(founder);
  await makePost(founder, { isHidden: true });
  await makePost(founder, { deletedAt: new Date() });

  const { status, json } = await api("/api/v1/recommendations", { token: viewer.token });
  assert.equal(status, 200);

  assert.deepEqual(
    json.data.startups.map((s) => s._id).sort(),
    [String(visibleStartup._id)]
  );
  assert.deepEqual(
    json.data.communities.map((c) => c._id).sort(),
    [String(visibleCommunity._id)]
  );
  const postIds = json.data.posts.map((p) => p._id);
  assert.ok(postIds.includes(String(visiblePost._id)));
  assert.equal(postIds.length, 1);

  const userIds = json.data.users.map((u) => u._id);
  assert.ok(!userIds.includes(String(viewer.user._id)));
});

test("includes a Marketplace recommendations section respecting the same visibility rules", async () => {
  const viewer = await createAuthenticatedTestUser();
  const provider = await createAuthenticatedTestUser();
  const listing = await makeListing(provider);
  await makeListing(provider, { status: "draft" });

  const { json } = await api("/api/v1/recommendations", { token: viewer.token });
  assert.equal(json.data.listings.length, 1);
  assert.equal(json.data.listings[0]._id, String(listing._id));
});

test("post recommendations are deduplicated between the newest and most-liked sections", async () => {
  const viewer = await createAuthenticatedTestUser();
  const founder = await createAuthenticatedTestUser();
  await makePost(founder, { content: "Only post, both newest and most-liked", likeCount: 5 });

  const { json } = await api("/api/v1/recommendations", { token: viewer.token });
  assert.equal(json.data.posts.length, 1);
});
