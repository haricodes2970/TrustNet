// Funding module integration tests. Verifies fundingRoundService/
// fundingContributionService (including their own locally-duplicated
// resolveStartupAccess — NOT workspaceService, NOT jobService, NOT
// investmentInterestService) against a real MongoDB instance. Out of
// scope: validators, controllers, routes, performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const fundingRoundService = require("../../src/services/fundingRoundService");
const fundingContributionService = require("../../src/services/fundingContributionService");
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

async function activateStartup(fx) {
  await Startup.findByIdAndUpdate(fx.startup._id, { status: "active" });
}

async function openRound(fx) {
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  return fundingRoundService.openRound(round._id, fx.founder.user._id);
}

// --- FundingRound: create, draft-only edit, contributor read-only ---

test("owner can create a funding round", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  assert.equal(round.status, "draft");
  assert.equal(round.raisedAmount, 0);
});

test("admin can create a funding round", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.adminMember.user._id
  );
  assert.equal(round.status, "draft");
});

test("contributor CANNOT create a funding round", async () => {
  const fx = await createStartupTeamFixture();
  await assert.rejects(
    () =>
      fundingRoundService.createRound(
        { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
        fx.contributorMember.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("unrelated user CANNOT create a funding round", async () => {
  const fx = await createStartupTeamFixture();
  await assert.rejects(
    () =>
      fundingRoundService.createRound(
        { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
        fx.unrelatedUser.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("creating a round for a non-existent startup throws ApiError 404", async () => {
  const investor = await createAuthenticatedTestUser();
  await assert.rejects(
    () =>
      fundingRoundService.createRound(
        { startupId: "507f1f77bcf86cd799439011", title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
        investor.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
});

test("owner can update a draft round", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  const updated = await fundingRoundService.updateRound(round._id, fx.founder.user._id, { title: "Renamed Round" });
  assert.equal(updated.title, "Renamed Round");
});

test("updating a non-draft round throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  await assert.rejects(
    () => fundingRoundService.updateRound(round._id, fx.founder.user._id, { title: "Renamed Round" }),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("contributor CANNOT update a round", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  await assert.rejects(
    () => fundingRoundService.updateRound(round._id, fx.contributorMember.user._id, { title: "Hijacked" }),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

// --- FundingRound lifecycle ---

test("owner can open a draft round when the startup is active", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  assert.equal(round.status, "open");
  assert.ok(round.openedAt);
});

test("opening a round for a non-active startup throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  await assert.rejects(
    () => fundingRoundService.openRound(round._id, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("owner can close an open round", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const closed = await fundingRoundService.closeRound(round._id, fx.founder.user._id);
  assert.equal(closed.status, "closed");
  assert.ok(closed.closedAt);
});

test("owner can cancel a draft round", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  const cancelled = await fundingRoundService.cancelRound(round._id, fx.founder.user._id);
  assert.equal(cancelled.status, "cancelled");
});

test("owner can cancel an open round", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const cancelled = await fundingRoundService.cancelRound(round._id, fx.founder.user._id);
  assert.equal(cancelled.status, "cancelled");
});

test("closing a draft round (skipping open) throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  await assert.rejects(
    () => fundingRoundService.closeRound(round._id, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("transitioning out of a closed round throws ApiError 409 (terminal)", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  await fundingRoundService.closeRound(round._id, fx.founder.user._id);
  await assert.rejects(
    () => fundingRoundService.cancelRound(round._id, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

// --- FundingRound view/list ---

test("contributor CAN view a non-open round for their startup (read-only tier)", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  const viewed = await fundingRoundService.getRoundForViewer(round._id, fx.contributorMember.user._id);
  assert.equal(String(viewed._id), String(round._id));
});

test("anonymous/unrelated viewer of a draft round gets ApiError 404 (existence concealed)", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  await assert.rejects(
    () => fundingRoundService.getRoundForViewer(round._id, null),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
  await assert.rejects(
    () => fundingRoundService.getRoundForViewer(round._id, fx.unrelatedUser.user._id),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
});

test("anonymous viewer CAN view an open round", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const viewed = await fundingRoundService.getRoundForViewer(round._id, null);
  assert.equal(String(viewed._id), String(round._id));
});

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?startupId= filter — scoped to open-only, not the full roster", async () => {
  const fx = await createStartupTeamFixture();
  await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Draft Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );

  const results = await fundingRoundService.listRoundsForUser(fx.unrelatedUser.user._id, { startup: fx.startup._id }, {});
  assert.equal(results.length, 0);
});

test("owner/admin/contributor listing with an explicit startupId filter sees the full roster (including drafts)", async () => {
  const fx = await createStartupTeamFixture();
  await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Draft Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );

  const asOwner = await fundingRoundService.listRoundsForUser(fx.founder.user._id, { startup: fx.startup._id }, {});
  assert.equal(asOwner.length, 1);

  const asContributor = await fundingRoundService.listRoundsForUser(
    fx.contributorMember.user._id,
    { startup: fx.startup._id },
    {}
  );
  assert.equal(asContributor.length, 1);
});

// --- FundingContribution: pledge, gates ---

test("any authenticated user can pledge to an open round", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();

  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 5000, currency: "USD", note: "Excited to join." },
    investor.user._id
  );
  assert.equal(contribution.status, "pledged");
  assert.equal(String(contribution.investor), String(investor.user._id));
});

test("cannot pledge to a draft (not-open) round — ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  const round = await fundingRoundService.createRound(
    { startupId: fx.startup._id, title: "Seed Round", roundType: "seed", targetAmount: 100000, currency: "USD" },
    fx.founder.user._id
  );
  const investor = await createAuthenticatedTestUser();

  await assert.rejects(
    () => fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 5000, currency: "USD" }, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("pledging with a mismatched currency throws ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();

  await assert.rejects(
    () => fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 5000, currency: "EUR" }, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("an inactive user (User.isActive: false) cannot pledge — ApiError 403", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  await User.findByIdAndUpdate(investor.user._id, { isActive: false });

  await assert.rejects(
    () => fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 5000, currency: "USD" }, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("an investor CAN pledge more than once to the same round (no unique constraint)", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();

  await fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 1000, currency: "USD" }, investor.user._id);
  const second = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 2000, currency: "USD" },
    investor.user._id
  );
  assert.equal(second.status, "pledged");
});

// --- FundingContribution: view, list ---

test("investor can view their own contribution", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );

  const viewed = await fundingContributionService.getContributionForViewer(contribution._id, investor.user._id);
  assert.equal(String(viewed._id), String(contribution._id));
});

test("contributor CAN view a contribution for their startup (read-only tier)", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );

  const viewed = await fundingContributionService.getContributionForViewer(contribution._id, fx.contributorMember.user._id);
  assert.equal(String(viewed._id), String(contribution._id));
});

test("unrelated user CANNOT view a contribution — ApiError 403", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );

  await assert.rejects(
    () => fundingContributionService.getContributionForViewer(contribution._id, fx.unrelatedUser.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("an investor's list with no filter returns only their own contributions", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  await fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 1000, currency: "USD" }, investor.user._id);

  const results = await fundingContributionService.listContributionsForUser(investor.user._id, {}, {});
  assert.equal(results.length, 1);
});

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?fundingRound= filter", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investorA = await createAuthenticatedTestUser();
  await fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 1000, currency: "USD" }, investorA.user._id);

  const results = await fundingContributionService.listContributionsForUser(
    fx.unrelatedUser.user._id,
    { fundingRound: round._id },
    {}
  );
  assert.equal(results.length, 0);
});

test("owner/admin/contributor listing with an explicit fundingRound filter sees the full roster", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();
  await fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 1000, currency: "USD" }, investorA.user._id);
  await fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 2000, currency: "USD" }, investorB.user._id);

  const asOwner = await fundingContributionService.listContributionsForUser(fx.founder.user._id, { fundingRound: round._id }, {});
  assert.equal(asOwner.length, 2);

  const asContributor = await fundingContributionService.listContributionsForUser(
    fx.contributorMember.user._id,
    { fundingRound: round._id },
    {}
  );
  assert.equal(asContributor.length, 2);
});

// --- FundingContribution lifecycle + funding totals ---

test("owner can confirm a pledged contribution", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );

  const confirmed = await fundingContributionService.confirmContribution(contribution._id, fx.founder.user._id);
  assert.equal(confirmed.status, "confirmed");
});

test("confirming a contribution atomically increments FundingRound.raisedAmount and Startup.fundingRaised", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1500, currency: "USD" },
    investor.user._id
  );

  await fundingContributionService.confirmContribution(contribution._id, fx.founder.user._id);

  const updatedRound = await fundingRoundService.getRoundById(round._id);
  assert.equal(updatedRound.raisedAmount, 1500);

  const updatedStartup = await Startup.findById(fx.startup._id).lean();
  assert.equal(updatedStartup.fundingRaised, 1500);
});

test("cumulative totals are correct after multiple confirmed contributions", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();

  const contributionA = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investorA.user._id
  );
  const contributionB = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 2500, currency: "USD" },
    investorB.user._id
  );

  await fundingContributionService.confirmContribution(contributionA._id, fx.founder.user._id);
  await fundingContributionService.confirmContribution(contributionB._id, fx.adminMember.user._id);

  const updatedRound = await fundingRoundService.getRoundById(round._id);
  assert.equal(updatedRound.raisedAmount, 3500);

  const updatedStartup = await Startup.findById(fx.startup._id).lean();
  assert.equal(updatedStartup.fundingRaised, 3500);
});

test("pledged (not confirmed) contributions do NOT affect totals", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  await fundingContributionService.createContribution({ fundingRoundId: round._id, amount: 1000, currency: "USD" }, investor.user._id);

  const updatedRound = await fundingRoundService.getRoundById(round._id);
  assert.equal(updatedRound.raisedAmount, 0);

  const updatedStartup = await Startup.findById(fx.startup._id).lean();
  assert.equal(updatedStartup.fundingRaised, 0);
});

test("rejecting or withdrawing a contribution does NOT affect totals", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();

  const contributionA = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investorA.user._id
  );
  const contributionB = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 2000, currency: "USD" },
    investorB.user._id
  );

  await fundingContributionService.rejectContribution(contributionA._id, fx.founder.user._id);
  await fundingContributionService.withdraw(contributionB._id, investorB.user._id);

  const updatedRound = await fundingRoundService.getRoundById(round._id);
  assert.equal(updatedRound.raisedAmount, 0);

  const updatedStartup = await Startup.findById(fx.startup._id).lean();
  assert.equal(updatedStartup.fundingRaised, 0);
});

test("owner can reject a pledged contribution", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );

  const rejected = await fundingContributionService.rejectContribution(contribution._id, fx.founder.user._id);
  assert.equal(rejected.status, "rejected");
});

test("investor can withdraw their own pledged contribution", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );

  const withdrawn = await fundingContributionService.withdraw(contribution._id, investor.user._id);
  assert.equal(withdrawn.status, "withdrawn");
});

test("a different investor CANNOT withdraw someone else's contribution — ApiError 403", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investorA = await createAuthenticatedTestUser();
  const investorB = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investorA.user._id
  );

  await assert.rejects(
    () => fundingContributionService.withdraw(contribution._id, investorB.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("contributor CANNOT confirm or reject a contribution — ApiError 403", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );

  await assert.rejects(
    () => fundingContributionService.confirmContribution(contribution._id, fx.contributorMember.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
  await assert.rejects(
    () => fundingContributionService.rejectContribution(contribution._id, fx.contributorMember.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("confirming an already-confirmed contribution throws ApiError 409 (terminal)", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );
  await fundingContributionService.confirmContribution(contribution._id, fx.founder.user._id);

  await assert.rejects(
    () => fundingContributionService.confirmContribution(contribution._id, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("investor CANNOT withdraw an already-confirmed contribution — ApiError 409", async () => {
  const fx = await createStartupTeamFixture();
  await activateStartup(fx);
  const round = await openRound(fx);
  const investor = await createAuthenticatedTestUser();
  const contribution = await fundingContributionService.createContribution(
    { fundingRoundId: round._id, amount: 1000, currency: "USD" },
    investor.user._id
  );
  await fundingContributionService.confirmContribution(contribution._id, fx.founder.user._id);

  await assert.rejects(
    () => fundingContributionService.withdraw(contribution._id, investor.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});
