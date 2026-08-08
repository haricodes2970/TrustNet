// Financial + social integrity under concurrency (Phase 17 final audit).
// The per-module suites already prove the sequential state machines; this
// file fires genuinely concurrent HTTP requests at the operations where a
// lost update or a double-apply would corrupt a number a user can see:
// funding totals, and post like/comment counters.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const app = require("../../app");
const Startup = require("../../src/models/Startup");
const FundingRound = require("../../src/models/FundingRound");
const Post = require("../../src/models/Post");

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

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;

async function seedFundingScenario() {
  const founder = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED" });
  const investor = await createAuthenticatedTestUser({ role: "investor", emailVerified: true, accountStatus: "APPROVED" });
  const suffix = unique();

  const startup = await Startup.create({
    name: `Concurrency Co ${suffix}`,
    slug: `concurrency-co-${suffix}`,
    description: "A startup used to verify concurrent funding confirmation safety end to end.",
    category: "SaaS",
    founder: founder.user._id,
    status: "active",
    isPublic: true,
  });

  const round = await FundingRound.create({
    startup: startup._id,
    title: "Concurrency Seed",
    roundType: "seed",
    targetAmount: 100000,
    currency: "USD",
    status: "open",
    createdBy: founder.user._id,
  });

  return { founder, investor, startup, round };
}

test("concurrent confirms of the same contribution apply the amount exactly once", async () => {
  const { founder, investor, startup, round } = await seedFundingScenario();

  const created = await api("/api/v1/funding-contributions", {
    method: "POST",
    token: investor.token,
    body: { fundingRoundId: String(round._id), amount: 5000, currency: "USD" },
  });
  assert.equal(created.status, 201, `contribution setup failed: ${JSON.stringify(created.json)}`);
  const contributionId = created.json.data._id || created.json.data.id;

  // Eight simultaneous confirms of the SAME contribution.
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      api(`/api/v1/funding-contributions/${contributionId}/confirm`, { method: "PUT", token: founder.token })
    )
  );

  const succeeded = results.filter((r) => r.status === 200);
  assert.equal(succeeded.length, 1, `exactly one confirm must win, got ${succeeded.length} (${results.map((r) => r.status).join(",")})`);

  const finalRound = await FundingRound.findById(round._id).lean();
  assert.equal(finalRound.raisedAmount, 5000, "the amount must be applied exactly once, not once per concurrent call");

  const finalStartup = await Startup.findById(startup._id).lean();
  assert.equal(finalStartup.fundingRaised, 5000, "the startup total must also be applied exactly once");
});

test("concurrent confirms of DIFFERENT contributions all apply, with no lost update", async () => {
  const { founder, investor, round } = await seedFundingScenario();

  const ids = [];
  for (const amount of [1000, 2000, 3000, 4000]) {
    // eslint-disable-next-line no-await-in-loop
    const created = await api("/api/v1/funding-contributions", {
      method: "POST",
      token: investor.token,
      body: { fundingRoundId: String(round._id), amount, currency: "USD" },
    });
    assert.equal(created.status, 201);
    ids.push(created.json.data._id || created.json.data.id);
  }

  const results = await Promise.all(
    ids.map((id) => api(`/api/v1/funding-contributions/${id}/confirm`, { method: "PUT", token: founder.token }))
  );
  assert.ok(results.every((r) => r.status === 200), `all four confirms should succeed: ${results.map((r) => r.status).join(",")}`);

  const finalRound = await FundingRound.findById(round._id).lean();
  assert.equal(finalRound.raisedAmount, 10000, "every confirmed amount must be reflected - a lost update would show less");
});

test("a contribution cannot be confirmed after it was rejected", async () => {
  const { founder, investor, round } = await seedFundingScenario();

  const created = await api("/api/v1/funding-contributions", {
    method: "POST",
    token: investor.token,
    body: { fundingRoundId: String(round._id), amount: 7000, currency: "USD" },
  });
  const contributionId = created.json.data._id || created.json.data.id;

  const rejected = await api(`/api/v1/funding-contributions/${contributionId}/reject`, { method: "PUT", token: founder.token });
  assert.equal(rejected.status, 200);

  const confirmAfter = await api(`/api/v1/funding-contributions/${contributionId}/confirm`, { method: "PUT", token: founder.token });
  assert.ok(confirmAfter.status >= 400, "confirming a rejected contribution must fail");

  const finalRound = await FundingRound.findById(round._id).lean();
  assert.equal(finalRound.raisedAmount, 0, "a rejected contribution must never reach the round total");
});

test("concurrent likes from the same user count once, and unlike reverses exactly once", async () => {
  const author = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED" });
  const liker = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED" });

  const created = await api("/api/v1/posts", {
    method: "POST",
    token: author.token,
    body: { content: "A post used to verify like-counter atomicity." },
  });
  assert.equal(created.status, 201);
  const postId = created.json.data._id || created.json.data.id;

  // Six simultaneous likes from ONE user.
  await Promise.all(
    Array.from({ length: 6 }, () => api(`/api/v1/posts/${postId}/like`, { method: "POST", token: liker.token }))
  );

  const afterLikes = await Post.findById(postId).lean();
  assert.equal(afterLikes.likeCount, 1, `one user liking concurrently must count once, got ${afterLikes.likeCount}`);

  // Six simultaneous unlikes.
  await Promise.all(
    Array.from({ length: 6 }, () => api(`/api/v1/posts/${postId}/like`, { method: "DELETE", token: liker.token }))
  );

  const afterUnlikes = await Post.findById(postId).lean();
  assert.equal(afterUnlikes.likeCount, 0, `the counter must not go negative or stick, got ${afterUnlikes.likeCount}`);
});

test("concurrent likes from different users all count, and the comment counter stays consistent", async () => {
  const author = await createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED" });
  const likers = await Promise.all(
    Array.from({ length: 5 }, () => createAuthenticatedTestUser({ emailVerified: true, accountStatus: "APPROVED" }))
  );

  const created = await api("/api/v1/posts", {
    method: "POST",
    token: author.token,
    body: { content: "A post used to verify multi-user counter accuracy." },
  });
  const postId = created.json.data._id || created.json.data.id;

  await Promise.all(likers.map((u) => api(`/api/v1/posts/${postId}/like`, { method: "POST", token: u.token })));
  const afterLikes = await Post.findById(postId).lean();
  assert.equal(afterLikes.likeCount, 5, `five distinct likers must produce 5, got ${afterLikes.likeCount}`);

  await Promise.all(
    likers.map((u) =>
      api(`/api/v1/posts/${postId}/comments`, { method: "POST", token: u.token, body: { content: "Concurrent comment." } })
    )
  );
  const afterComments = await Post.findById(postId).lean();
  assert.equal(afterComments.commentCount, 5, `five concurrent comments must produce 5, got ${afterComments.commentCount}`);
});
