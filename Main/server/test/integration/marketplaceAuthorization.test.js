// Marketplace module integration tests. Verifies providerProfileService/
// serviceListingService/engagementRequestService (including engagement-
// RequestService's own locally-duplicated resolveStartupAccess — NOT
// workspaceService, NOT jobService, NOT investmentInterestService, NOT
// fundingRoundService) against a real MongoDB instance. Out of scope:
// validators, controllers, routes, performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const providerProfileService = require("../../src/services/providerProfileService");
const serviceListingService = require("../../src/services/serviceListingService");
const engagementRequestService = require("../../src/services/engagementRequestService");
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

async function createProviderWithDraftListing() {
  const provider = await createAuthenticatedTestUser();
  const profile = await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);
  const listing = await serviceListingService.createListing(
    { title: "Brand Strategy", category: "Marketing", description: "Full brand overhaul.", pricingModel: "fixed" },
    provider.user._id
  );
  return { provider, profile, listing };
}

async function createProviderWithPublishedListing() {
  const built = await createProviderWithDraftListing();
  const listing = await serviceListingService.publishListing(built.listing._id, built.provider.user._id);
  return { ...built, listing };
}

// --- ProviderProfile: create, update-own, public read ---

test("any authenticated user can create their own provider profile", async () => {
  const provider = await createAuthenticatedTestUser();
  const profile = await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);
  assert.equal(String(profile.user), String(provider.user._id));
});

test("a user cannot create a second provider profile — ApiError 409", async () => {
  const provider = await createAuthenticatedTestUser();
  await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);
  await assert.rejects(
    () => providerProfileService.createProfile({ businessName: "Second Co" }, provider.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("provider profiles are publicly listable and gettable", async () => {
  const provider = await createAuthenticatedTestUser();
  const profile = await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);

  const list = await providerProfileService.listProfiles({}, {});
  assert.equal(list.length, 1);

  const fetched = await providerProfileService.getProfileById(profile._id);
  assert.equal(fetched.businessName, "Acme Consulting");
});

test("owner can update their own provider profile", async () => {
  const provider = await createAuthenticatedTestUser();
  const profile = await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);
  const updated = await providerProfileService.updateProfile(profile._id, provider.user._id, { businessName: "Renamed Co" });
  assert.equal(updated.businessName, "Renamed Co");
});

test("a different user CANNOT update someone else's provider profile — ApiError 403", async () => {
  const provider = await createAuthenticatedTestUser();
  const otherUser = await createAuthenticatedTestUser();
  const profile = await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);

  await assert.rejects(
    () => providerProfileService.updateProfile(profile._id, otherUser.user._id, { businessName: "Hijacked" }),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

// --- ServiceListing: create requires a profile, ownership, publish gate ---

test("creating a listing without a provider profile throws ApiError 409", async () => {
  const user = await createAuthenticatedTestUser();
  await assert.rejects(
    () =>
      serviceListingService.createListing(
        { title: "Brand Strategy", category: "Marketing" },
        user.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("owner can publish a complete, non-archived listing", async () => {
  const { provider, listing } = await createProviderWithDraftListing();
  const published = await serviceListingService.publishListing(listing._id, provider.user._id);
  assert.equal(published.status, "published");
});

test("publishing an incomplete listing throws ApiError 409", async () => {
  const provider = await createAuthenticatedTestUser();
  await providerProfileService.createProfile({ businessName: "Acme Consulting" }, provider.user._id);
  const listing = await serviceListingService.createListing({ title: "Brand Strategy", category: "Marketing" }, provider.user._id);

  await assert.rejects(
    () => serviceListingService.publishListing(listing._id, provider.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("PROVIDER CANNOT modify another provider's listing — ApiError 403", async () => {
  const { listing } = await createProviderWithDraftListing();
  const otherProvider = await createAuthenticatedTestUser();
  await providerProfileService.createProfile({ businessName: "Other Co" }, otherProvider.user._id);

  await assert.rejects(
    () => serviceListingService.updateListing(listing._id, otherProvider.user._id, { title: "Hijacked" }),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("STARTUP OWNER CANNOT modify a provider-owned listing — ApiError 403", async () => {
  const { listing } = await createProviderWithDraftListing();
  const fx = await createStartupTeamFixture();

  await assert.rejects(
    () => serviceListingService.updateListing(listing._id, fx.founder.user._id, { title: "Hijacked" }),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
  await assert.rejects(
    () => serviceListingService.archiveListing(listing._id, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
  await assert.rejects(
    () => serviceListingService.publishListing(listing._id, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("a draft listing returns ApiError 404 (concealed) to anyone but the owning provider, including anonymous", async () => {
  const { listing } = await createProviderWithDraftListing();
  const otherUser = await createAuthenticatedTestUser();

  await assert.rejects(
    () => serviceListingService.getListingForViewer(listing._id, null),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
  await assert.rejects(
    () => serviceListingService.getListingForViewer(listing._id, otherUser.user._id),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
});

test("anonymous viewer CAN view a published listing", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const viewed = await serviceListingService.getListingForViewer(listing._id, null);
  assert.equal(String(viewed._id), String(listing._id));
});

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?provider= filter — scoped to published-only", async () => {
  const { profile } = await createProviderWithDraftListing();
  const otherUser = await createAuthenticatedTestUser();

  const results = await serviceListingService.listListingsForUser(otherUser.user._id, { provider: profile._id }, {});
  assert.equal(results.length, 0);
});

test("owner listing with an explicit provider filter sees the full roster (including drafts)", async () => {
  const { provider, profile } = await createProviderWithDraftListing();
  const results = await serviceListingService.listListingsForUser(provider.user._id, { provider: profile._id }, {});
  assert.equal(results.length, 1);
});

// --- EngagementRequest: create gates ---

test("Startup owner can request engagement with a published listing", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();

  const request = await engagementRequestService.createRequest(
    { serviceListingId: listing._id, startupId: fx.startup._id, message: "Interested in your services." },
    fx.founder.user._id
  );
  assert.equal(request.status, "requested");
  assert.equal(String(request.startup), String(fx.startup._id));
});

test("cannot request engagement with a draft (not-published) listing — ApiError 409", async () => {
  const { listing } = await createProviderWithDraftListing();
  const fx = await createStartupTeamFixture();

  await assert.rejects(
    () => engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("contributor CANNOT request engagement on behalf of the startup — ApiError 403", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();

  await assert.rejects(
    () =>
      engagementRequestService.createRequest(
        { serviceListingId: listing._id, startupId: fx.startup._id },
        fx.contributorMember.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("unrelated user CANNOT request engagement on behalf of a startup — ApiError 403", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();

  await assert.rejects(
    () =>
      engagementRequestService.createRequest(
        { serviceListingId: listing._id, startupId: fx.startup._id },
        fx.unrelatedUser.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("requesting engagement for a non-existent listing throws ApiError 404", async () => {
  const fx = await createStartupTeamFixture();
  await assert.rejects(
    () =>
      engagementRequestService.createRequest(
        { serviceListingId: "507f1f77bcf86cd799439011", startupId: fx.startup._id },
        fx.founder.user._id
      ),
    (error) => error instanceof ApiError && error.statusCode === 404
  );
});

// --- Duplicate prevention + re-engagement after terminal states ---

test("DUPLICATE ACTIVE requests from the same startup to the same listing are blocked — ApiError 409", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  await assert.rejects(
    () => engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("RE-ENGAGEMENT is allowed after a request is declined", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const first = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  await engagementRequestService.updateStatus(first._id, provider.user._id, { status: "declined" });

  const second = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  assert.equal(second.status, "requested");
});

test("RE-ENGAGEMENT is allowed after a request is cancelled", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const first = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  await engagementRequestService.cancelRequest(first._id, fx.founder.user._id);

  const second = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  assert.equal(second.status, "requested");
});

test("RE-ENGAGEMENT is allowed after a request is completed", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const first = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  await engagementRequestService.updateStatus(first._id, provider.user._id, { status: "accepted" });
  await engagementRequestService.updateStatus(first._id, provider.user._id, { status: "in_progress" });
  await engagementRequestService.updateStatus(first._id, provider.user._id, { status: "completed" });

  const second = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  assert.equal(second.status, "requested");
});

// --- EngagementRequest: view/list authorization ---

test("startup owner/admin/contributor can view their startup's engagement request", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  for (const actor of [fx.founder, fx.adminMember, fx.contributorMember]) {
    const viewed = await engagementRequestService.getRequestForViewer(request._id, actor.user._id);
    assert.equal(String(viewed._id), String(request._id));
  }
});

test("the owning provider can view an engagement request on their listing", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const viewed = await engagementRequestService.getRequestForViewer(request._id, provider.user._id);
  assert.equal(String(viewed._id), String(request._id));
});

test("PROVIDER CANNOT access unrelated engagement requests — ApiError 403", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const unrelatedProvider = await createAuthenticatedTestUser();
  await providerProfileService.createProfile({ businessName: "Unrelated Co" }, unrelatedProvider.user._id);

  await assert.rejects(
    () => engagementRequestService.getRequestForViewer(request._id, unrelatedProvider.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("STARTUP CANNOT access another startup's engagement request — ApiError 403", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fxA = await createStartupTeamFixture();
  const fxB = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fxA.startup._id }, fxA.founder.user._id);

  await assert.rejects(
    () => engagementRequestService.getRequestForViewer(request._id, fxB.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?startup= filter", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const unrelatedUser = await createAuthenticatedTestUser();
  const results = await engagementRequestService.listRequestsForUser(unrelatedUser.user._id, { startup: fx.startup._id }, {});
  assert.equal(results.length, 0);
});

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?serviceListing= filter", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const unrelatedUser = await createAuthenticatedTestUser();
  const results = await engagementRequestService.listRequestsForUser(unrelatedUser.user._id, { serviceListing: listing._id }, {});
  assert.equal(results.length, 0);
});

test("startup owner/admin/contributor listing with an explicit startup filter sees the full roster", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const asContributor = await engagementRequestService.listRequestsForUser(fx.contributorMember.user._id, { startup: fx.startup._id }, {});
  assert.equal(asContributor.length, 1);
});

test("owning provider listing with an explicit serviceListing filter sees the full roster", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fxA = await createStartupTeamFixture();
  const fxB = await createStartupTeamFixture();
  await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fxA.startup._id }, fxA.founder.user._id);
  await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fxB.startup._id }, fxB.founder.user._id);

  const results = await engagementRequestService.listRequestsForUser(provider.user._id, { serviceListing: listing._id }, {});
  assert.equal(results.length, 2);
});

// --- EngagementRequest: lifecycle (provider status advance, startup cancel) ---

test("owning provider can advance the full happy-path lifecycle", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const accepted = await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "accepted" });
  assert.equal(accepted.status, "accepted");
  const started = await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "in_progress" });
  assert.equal(started.status, "in_progress");
  const completed = await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "completed" });
  assert.equal(completed.status, "completed");
});

test("owning provider can decline a requested engagement", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const declined = await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "declined" });
  assert.equal(declined.status, "declined");
});

test("STARTUP OWNER CANNOT advance engagement status — ApiError 403", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  await assert.rejects(
    () => engagementRequestService.updateStatus(request._id, fx.founder.user._id, { status: "accepted" }),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("provider CANNOT skip ahead in the status lifecycle — ApiError 409", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  await assert.rejects(
    () => engagementRequestService.updateStatus(request._id, provider.user._id, { status: "in_progress" }),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("startup owner can cancel their own request while requested", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  const cancelled = await engagementRequestService.cancelRequest(request._id, fx.founder.user._id);
  assert.equal(cancelled.status, "cancelled");
});

test("startup admin can cancel while accepted", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "accepted" });

  const cancelled = await engagementRequestService.cancelRequest(request._id, fx.adminMember.user._id);
  assert.equal(cancelled.status, "cancelled");
});

test("cancel is rejected once the engagement is in_progress — ApiError 409", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "accepted" });
  await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "in_progress" });

  await assert.rejects(
    () => engagementRequestService.cancelRequest(request._id, fx.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});

test("contributor CANNOT cancel an engagement request — ApiError 403", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  await assert.rejects(
    () => engagementRequestService.cancelRequest(request._id, fx.contributorMember.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("the owning provider CANNOT cancel an engagement request — ApiError 403", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);

  await assert.rejects(
    () => engagementRequestService.cancelRequest(request._id, provider.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("a different startup CANNOT cancel someone else's request — ApiError 403", async () => {
  const { listing } = await createProviderWithPublishedListing();
  const fxA = await createStartupTeamFixture();
  const fxB = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fxA.startup._id }, fxA.founder.user._id);

  await assert.rejects(
    () => engagementRequestService.cancelRequest(request._id, fxB.founder.user._id),
    (error) => error instanceof ApiError && error.statusCode === 403
  );
});

test("transitioning out of a terminal state is rejected — ApiError 409", async () => {
  const { provider, listing } = await createProviderWithPublishedListing();
  const fx = await createStartupTeamFixture();
  const request = await engagementRequestService.createRequest({ serviceListingId: listing._id, startupId: fx.startup._id }, fx.founder.user._id);
  await engagementRequestService.updateStatus(request._id, provider.user._id, { status: "declined" });

  await assert.rejects(
    () => engagementRequestService.updateStatus(request._id, provider.user._id, { status: "accepted" }),
    (error) => error instanceof ApiError && error.statusCode === 409
  );
});
