// Investor module integration tests. Verifies investorService/
// investmentInterestService (including its own locally-duplicated
// resolveStartupAccess — NOT workspaceService, NOT jobService) against a
// real MongoDB instance. Out of scope: validators, controllers, routes,
// performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const investorService = require("../../src/services/investorService");
const investmentInterestService = require("../../src/services/investmentInterestService");
const Startup = require("../../src/models/Startup");
const User = require("../../src/models/User");
const ApiError = require("../../src/utils/ApiError");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

// --- Investor profile: create, update-own, public read ---

test("any authenticated user can create their own investor profile", async () => {
  const investor = await createAuthenticatedTestUser();
  const profile = await investorService.createProfile({ organization: "Acme Capital" }, investor.user._id);
  assert.equal(String(profile.user), String(investor.user._id));
});

test("a user cannot create a second investor profile", async () => {
  const investor = await createAuthenticatedTestUser();
  await investorService.createProfile({ organization: "Acme Capital" }, investor.user._id);
  await assert.rejects(
    () => investorService.createProfile({ organization: "Second Fund" }, investor.user._id),
    /already have an investor profile/
  );
});

test("investor profiles are publicly listable and gettable (no auth check in these functions)", async () => {
  const investor = await createAuthenticatedTestUser();
  const profile = await investorService.createProfile({ organization: "Acme Capital" }, investor.user._id);

  const list = await investorService.listProfiles({}, {});
  assert.equal(list.length, 1);

  const fetched = await investorService.getProfileById(profile._id);
  assert.equal(fetched.organization, "Acme Capital");
});

test("owner can update their own investor profile", async () => {
  const investor = await createAuthenticatedTestUser();
  const profile = await investorService.createProfile({ organization: "Acme Capital" }, investor.user._id);
  const updated = await investorService.updateProfile(profile._id, investor.user._id, {
    organization: "Renamed Capital",
  });
  assert.equal(updated.organization, "Renamed Capital");
});

test("a different user CANNOT update someone else's investor profile", async () => {
  const investor = await createAuthenticatedTestUser();
  const otherUser = await createAuthenticatedTestUser();
  const profile = await investorService.createProfile({ organization: "Acme Capital" }, investor.user._id);

  await assert.rejects(
    () => investorService.updateProfile(profile._id, otherUser.user._id, { organization: "Hijacked" }),
    /not authorized/
  );
});

// --- Express interest, view own, withdraw ---

async function activateStartup(fx) {
  await Startup.findByIdAndUpdate(fx.startup._id, { status: "active" });
}

test("any authenticated user can express interest in an active startup", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();

  const interest = await investmentInterestService.createInterest(
    { startupId: fx.startup._id, message: "Interested in leading the round." },
    investor.user._id
  );
  assert.equal(interest.status, "submitted");
  assert.equal(String(interest.investor), String(investor.user._id));
});

test("cannot express interest in a non-active startup (draft by default)", async () => {
  const fx = await createStartupTeamFixture();
  const investor = await createAuthenticatedTestUser();

  await assert.rejects(
    () => investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id),
    /not currently accepting investment interest/
  );
});

test("an inactive user (User.isActive: false) cannot express interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  await User.findByIdAndUpdate(investor.user._id, { isActive: false });

  await assert.rejects(
    () => investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id),
    /account is not active/
  );
});

test("investor can view their own interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  const viewed = await investmentInterestService.getInterestForViewer(interest._id, investor.user._id);
  assert.equal(String(viewed._id), String(interest._id));
});

test("a different investor CANNOT view someone else's interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investorA.user._id);

  await assert.rejects(
    () => investmentInterestService.getInterestForViewer(interest._id, investorB.user._id),
    /not authorized/
  );
});

test("investor can withdraw from a non-terminal state", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  const withdrawn = await investmentInterestService.withdraw(interest._id, investor.user._id);
  assert.equal(withdrawn.status, "withdrawn");
});

test("investor CANNOT withdraw an already-terminal interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);
  await investmentInterestService.updateStatus(interest._id, fx.founder.user._id, { status: "reviewing" });
  await investmentInterestService.updateStatus(interest._id, fx.founder.user._id, { status: "declined" });

  await assert.rejects(() => investmentInterestService.withdraw(interest._id, investor.user._id), /terminal state/);
});

// --- Startup owner/admin: list, respond, archive ---

test("owner can update interest status along the happy path", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  const updated = await investmentInterestService.updateStatus(interest._id, fx.founder.user._id, {
    status: "reviewing",
  });
  assert.equal(updated.status, "reviewing");
});

test("admin can update interest status", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  const updated = await investmentInterestService.updateStatus(interest._id, fx.adminMember.user._id, {
    status: "reviewing",
  });
  assert.equal(updated.status, "reviewing");
});

test("owner/admin CANNOT skip status stages", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.updateStatus(interest._id, fx.founder.user._id, { status: "accepted" }),
    /Invalid status transition/
  );
});

test("owner can archive an interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  const archived = await investmentInterestService.archiveInterest(interest._id, fx.founder.user._id);
  assert.equal(archived.isArchived, true);
});

// --- Contributor: read-only (the deliberate divergence from Applications) ---

test("contributor CAN view an interest for their startup (read-only tier, unlike Applications)", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  const viewed = await investmentInterestService.getInterestForViewer(interest._id, fx.contributorMember.user._id);
  assert.equal(String(viewed._id), String(interest._id));
});

test("contributor CANNOT update interest status", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.updateStatus(interest._id, fx.contributorMember.user._id, { status: "reviewing" }),
    /not authorized/
  );
});

test("contributor CANNOT archive an interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.archiveInterest(interest._id, fx.contributorMember.user._id),
    /not authorized/
  );
});

// --- Unrelated users: no access ---

test("unrelated user CANNOT view or act on an interest", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.getInterestForViewer(interest._id, fx.unrelatedUser.user._id),
    /not authorized/
  );
  await assert.rejects(
    () => investmentInterestService.updateStatus(interest._id, fx.unrelatedUser.user._id, { status: "reviewing" }),
    /not authorized/
  );
});

// --- Duplicate prevention ---

test("an investor cannot express a second active interest in the same startup", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id),
    /already expressed interest/
  );
});

test("an investor CAN re-express interest after withdrawing (partial unique index excludes 'withdrawn')", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const first = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);
  await investmentInterestService.withdraw(first._id, investor.user._id);

  const second = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);
  assert.equal(second.status, "submitted");
});

// --- ApiError status-code contract ---

test("createProfile duplicate throws ApiError 409", async () => {
  const investor = await createAuthenticatedTestUser();
  await investorService.createProfile({ organization: "Acme Capital" }, investor.user._id);
  await assert.rejects(
    () => investorService.createProfile({ organization: "Second Fund" }, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("getProfileById on a missing profile throws ApiError 404", async () => {
  await assert.rejects(
    () => investorService.getProfileById("507f1f77bcf86cd799439011"),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
});

test("updateProfile by a non-owner throws ApiError 403", async () => {
  const investor = await createAuthenticatedTestUser();
  const otherUser = await createAuthenticatedTestUser();
  const profile = await investorService.createProfile({ organization: "Acme Capital" }, investor.user._id);

  await assert.rejects(
    () => investorService.updateProfile(profile._id, otherUser.user._id, { organization: "Hijacked" }),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("createInterest on a non-active startup throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  const investor = await createAuthenticatedTestUser();

  await assert.rejects(
    () => investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("createInterest by an inactive user throws ApiError 403", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  await User.findByIdAndUpdate(investor.user._id, { isActive: false });

  await assert.rejects(
    () => investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("getInterestForViewer by an unrelated user throws ApiError 403", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.getInterestForViewer(interest._id, fx.unrelatedUser.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("updateStatus with an invalid transition throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.updateStatus(interest._id, fx.founder.user._id, { status: "accepted" }),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("withdraw on a terminal interest throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  const interest = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);
  await investmentInterestService.updateStatus(interest._id, fx.founder.user._id, { status: "reviewing" });
  await investmentInterestService.updateStatus(interest._id, fx.founder.user._id, { status: "declined" });

  await assert.rejects(
    () => investmentInterestService.withdraw(interest._id, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("re-expressing a duplicate active interest throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  await assert.rejects(
    () => investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

// --- List authorization + regression ---

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?startupId= filter — scoped to their own (empty), not the full roster", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();
  await investmentInterestService.createInterest({ startupId: fx.startup._id }, investorA.user._id);
  const interestB = await investmentInterestService.createInterest({ startupId: fx.startup._id }, investorB.user._id);

  const results = await investmentInterestService.listInterestsForUser(
    investorB.user._id,
    { startup: fx.startup._id },
    {}
  );
  assert.equal(results.length, 1);
  assert.equal(String(results[0]._id), String(interestB._id));
});

test("owner/admin/contributor listing with an explicit startupId filter sees the full roster", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();
  await investmentInterestService.createInterest({ startupId: fx.startup._id }, investorA.user._id);
  await investmentInterestService.createInterest({ startupId: fx.startup._id }, investorB.user._id);

  const asOwner = await investmentInterestService.listInterestsForUser(
    fx.founder.user._id,
    { startup: fx.startup._id },
    {}
  );
  assert.equal(asOwner.length, 2);

  const asContributor = await investmentInterestService.listInterestsForUser(
    fx.contributorMember.user._id,
    { startup: fx.startup._id },
    {}
  );
  assert.equal(asContributor.length, 2);
});

test("an investor's list with no filter returns only their own interests", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const investor = await createAuthenticatedTestUser();
  await investmentInterestService.createInterest({ startupId: fx.startup._id }, investor.user._id);

  const results = await investmentInterestService.listInterestsForUser(investor.user._id, {}, {});
  assert.equal(results.length, 1);
});
