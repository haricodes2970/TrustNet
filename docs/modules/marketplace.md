# Module: Marketplace

Files: `src/routes/providerProfile.routes.js`, `src/routes/serviceListing.routes.js`, `src/routes/engagementRequest.routes.js`, `src/controllers/providerProfileController.js`, `src/controllers/serviceListingController.js`, `src/controllers/engagementRequestController.js`, `src/services/providerProfileService.js`, `src/services/serviceListingService.js`, `src/services/engagementRequestService.js`, `src/validators/providerProfile.validators.js`, `src/validators/serviceListing.validators.js`, `src/validators/engagementRequest.validators.js`, `src/models/ProviderProfile.js`, `src/models/ServiceListing.js`, `src/models/EngagementRequest.js`. Three resources; independent of Workspace/Project.

## Architecture

```
User (provider) 1---1 ProviderProfile
ProviderProfile 1---N ServiceListing
Startup 1---N EngagementRequest N---1 ServiceListing
```

Two distinct authority mechanisms meet in this module, more explicitly than any prior module:

- **Flat User ownership** on the supply side (`ProviderProfile`, `ServiceListing`). A provider is a `User`, not a Startup — no `resolveStartupAccess()` exists anywhere in `providerProfileService.js`/`serviceListingService.js`, by explicit instruction. Providers cannot be Startups in this design (see Architectural concerns).
- **Startup-role authority** on the demand side (`EngagementRequest`'s requester). `engagementRequestService.js` implements its own `resolveStartupAccess()` — a **fifth, deliberately duplicated** copy of the founder/admin/contributor role-computation logic already implemented separately in `workspaceService.resolveWorkspaceAccess()`, `jobService.resolveStartupAccess()`, `investmentInterestService.resolveStartupAccess()`, and `fundingRoundService.resolveStartupAccess()`. Not shared with any of them by explicit instruction — none of those four files are touched here.

`EngagementRequest` is the first resource in this codebase whose authorization requires **both** mechanisms simultaneously on the same document: `resolveStartupAccess()` for the requester side, `serviceListingService.resolveProviderOwnership()` (reused read-only, not duplicated) for the fulfiller side.

## Permissions model

**ProviderProfile** — identical shape to `InvestorProfile`: public list/get; create (one per user)/update owner-only. **Platform Admin override** (added in the Marketplace hardening phase) bypasses ownership on `updateProfile`.

**ServiceListing**

| Action | Provider (owner) | Any other user | Platform Admin | Public |
|---|---|---|---|---|
| Create | ✓ (must own a `ProviderProfile`) | ✗ | — | ✗ |
| Update/archive/restore/publish/unpublish | ✓ (must own the parent `ProviderProfile`) | ✗ | ✓ override | ✗ |
| View | ✓ any state | — | ✓ any state | ✓ only if `published`, not archived, and the provider's account is active |
| List | ✓ full roster for own profile | scoped to `published`-only | ✓ unfiltered | scoped to `published`-only |

**EngagementRequest**

| Action | Startup Owner/Admin | Contributor | Provider (listing owner) | Platform Admin | Public |
|---|---|---|---|---|---|
| Request (create) | ✓ (listing `published`, listing's provider active, requesting Startup active) | ✗ | — | — | ✗ |
| View | ✓ own Startup's requests | ✓ read-only | ✓ requests on their own listings | ✓ unfiltered | ✗ |
| Advance status (accept/decline/start/complete) | ✗ | ✗ | ✓ | ✓ override | ✗ |
| Cancel | ✓ own Startup's request, `requested`/`accepted` only | ✗ | ✗ | ✓ override | ✗ |

Contributor gets read-only — the same tier now established three times (Investment Interest, Funding, and here), not Application's zero-access tier. No public tier on `EngagementRequest` at all (`router.use(authenticate)`, then `router.use(authorize())` to populate `req.user.role` for the admin override, at the top of the route file).

## Provider account-state gating (Marketplace hardening phase)

`ProviderProfile` has no `isSuspended`/`deletedAt` of its own — it reuses the underlying `User`'s existing `isActive`/`deletedAt` (the platform's one suspend/delete mechanism, already set via `adminUserService.suspendUser`/`softDeleteUser`) instead of adding a parallel flag. This closes the "archived provider" / "deleted provider" edge cases end to end:

- `providerProfileService.getProfileForViewer`/`listProfiles` conceal (404) or exclude a suspended/deleted provider's profile from anyone but the owner or a platform admin.
- `serviceListingService.getListingForViewer`/`listListingsForUser` additionally hide a listing whose provider account is inactive, even if the listing itself is `published` and not archived.
- `engagementRequestService.createRequest` rejects (409) a new request against a listing whose provider account is inactive.

`providerProfileService.isProviderAccountActiveById`/`listInactiveProviderIds` are the shared entry points other files import (reuse, not duplication — this is the canonical owner of Provider account-state logic).

## Startup-state guard on EngagementRequest (Marketplace hardening phase)

`createRequest` previously checked only the listing's own state — a deleted, suspended, or non-`active` requesting Startup could still submit a request. `assertStartupAcceptingEngagement` closes this, same shape as `investmentInterestService.assertStartupAcceptingInterest`/`fundingRoundService.assertStartupActiveForFunding`.

## ServiceListing restore + duplicate-title validation (Marketplace hardening phase)

- `restoreListing` (new): `isArchived` existed with no way to undo it — same gap class `fundingRoundService.archiveRound`/`restoreRound` closed for FundingRound. Blocked for non-admins while `deletedAt` is set (that field is exclusively the admin-moderation "delete" action via `adminModerationService` — a provider can't self-service undo a platform admin's moderation decision through this endpoint).
- `assertNoDuplicateTitle` (new): case-insensitive, per-provider, active-listings-only, mirrors `startupService.assertNoDuplicateName`. Enforced on create and on title-changing updates.

## Verification awareness (Marketplace hardening phase)

`getProfileForViewer`/`listProfiles` now attach a `verification: { isVerified, verificationStatus }` field sourced from the linked `User` — the model's own design comment claimed this reuse but it was never actually wired up until this phase. `InvestorProfile` has the identical unimplemented gap, not fixed here (out of scope for this phase).

## View concealment (ServiceListing only)

`getListingForViewer` reuses `jobService.assertJobViewAccess`'s concealment convention, already reused once before by `fundingRoundService.getRoundForViewer`: a listing that isn't `published` (or is archived) returns **404, not 403**, to anyone who isn't its owning provider, including anonymous visitors. This is the third module reusing this specific precedent.

## List authorization — "downgrade to public subset" / "scope, don't reject"

- `listListingsForUser` reuses `jobService.listJobsForUser`'s exact shape (also already reused once by `fundingRoundService.listRoundsForUser`): an explicit `?providerId=` filter... — actually the controller passes `?providerId=` as `filter.provider` — from a caller who doesn't own that profile silently downgrades to the `published`-and-non-archived subset; no filter with no owned profile does the same; a caller who owns a profile and supplies no filter sees `published` listings everywhere plus every state for their own profile (via `$or`).
- `listRequestsForUser` has **two independent filter axes** — `?startupId=` for the requester side, `?serviceListingId=` for the provider side — a first for this codebase, since every prior scoped-list module had exactly one "which parent am I filtering by" axis. Each axis independently downgrades to `createdBy: userId` (the caller's own submissions) when the caller has no role/ownership on that axis; no filter at all also scopes to `createdBy: userId`.

Both are regression-tested the same way every prior list-authorization bug class has been: an unrelated/unauthorized caller supplying the filter explicitly cannot see anyone else's data through it — verified independently for each of `EngagementRequest`'s two filter axes.

## Service listing lifecycle

Reuses Job's exact three-state shape, no new design needed: `draft → published → archived`, via dedicated `/publish`/`/unpublish` actions plus a separate archive endpoint — not a generic status field. `assertPublishReady(listing)` (pure, `serviceListingService.js`, unit-tested) requires `title`/`description`/`category`/`pricingModel` and not archived, mirroring `jobService.assertPublishReady` field-for-field with Job's domain vocabulary swapped for Marketplace's.

## Engagement request lifecycle

```
requested → accepted → in_progress → completed   (terminal)
    ↓           ↓
    └───────────┴──→ declined                      (terminal, provider-only)
requested/accepted → cancelled                     (terminal, startup owner/admin-only, own request)
```

`assertValidEngagementTransition(currentStatus, nextStatus)` (pure, `engagementRequestService.js`, unit-tested) — a lookup-table implementation (`{requested: [accepted, declined, cancelled], accepted: [in_progress, declined, cancelled], in_progress: [completed]}`), the most complex transition table of any module so far, since two different actors can exit from two different non-terminal states. Deliberately not shared with `assertValidRoundTransition`/`assertValidContributionTransition`/`assertValidInterestTransition`/`assertValidStatusTransition`, per the project's standing "structurally similar but deliberately not shared" convention.

## Models

**ProviderProfile**: `user` (ref User, required, unique — one profile per user), `businessName` (required), `tagline`, `description`, `serviceCategories` (String[], freeform — same shape as `InvestorProfile.preferredIndustries`, no enum invented since categories are open-ended), `portfolioUrl` (URL-validated, reuses `Startup.websiteUrl`'s validator shape), `createdBy`/`updatedBy` (audit only). No `verificationStatus` field — reuses `User.verificationStatus`, same reasoning `InvestorProfile` already established.

**ServiceListing**: `provider` (ref **ProviderProfile**, required, indexed — deliberately coupled, unlike `FundingContribution.investor`/`InvestmentInterest.investor`, which ref `User` directly; a listing is intrinsically a profile's catalog entry, so requiring the profile to exist first is a real business rule here, not incidental decoupling like Funding/Investor's contribution side), `title`, `category` (freeform, not enum), `description` (not required at schema level — drafts may be incomplete, mirrors `Job.description`), `pricingModel` enum, `priceMin`/`priceMax` (cross-field ordering validated at service level via `validatePriceRange`, mirrors `jobService.validateSalaryRange`), `currency` enum (reuses the existing list), `status` enum (`draft/published/archived`, default `draft`, indexed — three states like `Job.status`, not four), `tags`, `createdBy`/`updatedBy` (audit only), `isArchived`.

**EngagementRequest**: `serviceListing` (ref ServiceListing, required, indexed), `startup` (ref Startup, required, indexed — the requesting Startup, not the individual team member who submitted), `message`, `status` enum (`requested/accepted/declined/in_progress/completed/cancelled`, default `requested`, indexed), `createdBy`/`updatedBy` (audit only — the acting team member, never used for authorization; authorization is Startup-role-based via `resolveStartupAccess`, or provider-ownership-based, never this-user-based).

**Partial unique index:** `{ serviceListing: 1, startup: 1 }`, excluding `declined`/`cancelled`/`completed` — blocks a concurrent duplicate *active* request from the same Startup to the same listing, while permitting re-engagement after **any** terminal outcome, including a prior successful `completed` engagement. This three-way exclusion is new — every prior duplicate-prevention index (Application, InvestmentInterest) excludes only one terminal status.

## API

**`/api/v1/provider-profiles`** — identical shape to `/investors`: `POST /`, `GET /`, `GET /:id`, `PUT /:id`.

**`/api/v1/service-listings`** — `POST /`, `GET /` (scoped/downgraded, `?providerId=`, `?search=`), `GET /:id` (404-concealment), `PUT /:id`, `DELETE /:id` (archive), `POST /:id/restore` (new this phase), `PUT /:id/publish`, `PUT /:id/unpublish`. `GET /` and `GET /:id` use `optionalAuthenticate` (added this phase).

**`/api/v1/engagement-requests`**

| Method | Path | Access |
|---|---|---|
| POST | `/` | Startup owner/admin, listing must be `published` |
| GET | `/` | scoped: Startup owner/admin/contributor with `?startupId=`, provider with `?serviceListingId=`, own-only (`createdBy`) otherwise |
| GET | `/:id` | Startup owner/admin/contributor (own Startup) or provider (own listing) |
| PUT | `/:id/status` | provider only — single endpoint covering accept/decline/start/complete, same shape `investmentInterestService.updateStatus` uses |
| PUT | `/:id/cancel` | Startup owner/admin only, own request, `requested`/`accepted` only |

Two mutation endpoints rather than four-plus dedicated verb endpoints — an MVP simplification versus Funding's fully-split `/confirm`/`/reject` shape: here all four provider-driven transitions share one actor and one authorization check, unlike Funding where `confirm` alone carried an atomic side effect that justified the split.

## Validation vs business rules

`providerProfile.validators.js`/`serviceListing.validators.js`/`engagementRequest.validators.js` (Joi): shape/type/enum/range only — `providerProfileCreate`/`Update` (`businessName` required on create, everything else optional), `serviceListingCreate`/`Update` (`title`/`category` required, no `status` field), `engagementRequestCreate` (`serviceListingId`/`startupId` required), `statusUpdate` (restricted to `accepted`/`declined`/`in_progress`/`completed` — excludes `requested`/`cancelled`).

**Business rules (service layer):** one `ProviderProfile` per user; a `ServiceListing` cannot be created without an existing `ProviderProfile` (409, not 403 — a state precondition, not an authorization failure); `priceMin <= priceMax`; publish requires required content fields + not archived; an `EngagementRequest` can only target a `published`, non-archived listing; duplicate-active-request prevention (app-level + DB partial index); all state-machine legality; all authorization (both mechanisms).

## Error handling

Same convention established in Applications/Investors/Funding: services throw typed `ApiError(statusCode, message)`; all three controllers are pure pass-through (`try { ...call service... } catch (error) { const status = error instanceof ApiError ? error.statusCode : 500; ... }`).

- **400** — malformed input (Joi), plus `validatePriceRange`'s own throw (the one business rule in this module that's a straightforward bad-input case, not a state conflict).
- **403** — authorization failure: insufficient Startup role, provider-ownership mismatch (bypassed by the platform-admin override, added this phase).
- **404** — resource not found; also used for `ServiceListing`'s and `ProviderProfile`'s view-concealment cases (see above).
- **409** — state conflict: no provider profile yet, listing not published (or archived, or provider account inactive) at request time, duplicate active request, duplicate listing title, terminal-state block, invalid transition, requesting Startup not active, self-restore blocked by admin moderation.

## Tests

**Unit** (`test/providerProfile.test.js`, 5; `test/serviceListing.test.js`, 11; `test/engagementRequest.test.js`, 13): Joi validators for all three resources, `validatePriceRange`, `assertPublishReady`, `assertValidEngagementTransition` (every valid edge including both terminal exits, both skip-ahead cases, terminal-state immutability, `ApiError`/statusCode shape).

**Integration**:
- `test/integration/marketplaceAuthorization.test.js` (service-level, DB-backed, 42 tests): profile create/duplicate-block/public-read/owner-update/non-owner-block; listing create-requires-profile/publish-gate/view-concealment/list-filter-regression, **a provider cannot modify another provider's listing**, **a Startup owner cannot modify a provider-owned listing**; engagement create-gates, **duplicate-active-request blocked**, **re-engagement allowed after each of the three terminal outcomes**; view/list authorization for both filter axes; full lifecycle coverage plus role-boundary checks. Its Startup fixtures are explicitly activated (`status: "active"`) to satisfy this phase's new `assertStartupAcceptingEngagement` guard.
- `test/integration/marketplaceLifecycle.test.js` (HTTP-level, new this phase, 14 tests): platform-admin override across profile-update/listing-update-archive-restore/status-advance/cancel; `verification` field on profile responses; suspended-provider concealment (profile directory+get, listing get+list); duplicate-title 409; archive/restore round-trip; self-restore blocked by admin-moderation delete; startup-state guard (draft/suspended/deleted all rejected) on engagement create; provider-account-state guard on engagement create; search; pagination.

Combined suite: **691/691 passing** (`npm run test:all`), no regressions in any prior module.

## Architectural concerns discovered

- **Fifth duplication of Startup role-resolution logic** (`workspaceService`, `jobService`, `investmentInterestService`, `fundingRoundService`, `engagementRequestService`). Tracked in `BACKLOG.md` per instruction — the strongest, most-repeated case yet for the dedicated authorization-cleanup phase flagged after Investor, again after Funding, and now a third time. Not addressed in the Marketplace hardening phase either, per the same explicit instruction.
- **First resource requiring two independent authority mechanisms simultaneously.** No prior module has this shape — Applications came closest (candidate-ownership + Startup-role) but only one side was Startup-scoped; here the fulfiller side is a completely independent User-ownership check (`ServiceListing → ProviderProfile → User`), resolved via `serviceListingService.resolveProviderOwnership()` and reused (not duplicated) by `engagementRequestService.resolveRequestRole()`. Both directions of the leak this could cause (provider seeing an unrelated Startup's request, Startup seeing an unrelated provider's request) have direct, explicit test coverage.
- **`ServiceListing.provider` refs `ProviderProfile`, deliberately coupling** where Funding/Investor deliberately decoupled contribution/interest from profile. A real, considered inconsistency across modules — documented here so it reads as a choice (see Architecture), not a copy-paste inconsistency.
- **Providers are individual Users, not Startups** — a Startup cannot itself be a service provider in this design (e.g. an agency-style Startup offering services to other Startups isn't representable). This is the scoping choice that avoided a sixth `resolveStartupAccess()` duplication on the supply side; a real capability limit, not just an implementation simplification, per the approved architecture.
- **`{serviceListing, startup}` partial unique index excludes three terminal statuses**, more than any prior module's duplicate-prevention index. Re-engagement after a *successful* completed engagement is allowed by design and directly tested.
- **Dual-filter list endpoint** (`?startupId=` vs `?serviceListingId=`) on `EngagementRequest` is a new shape — every prior scoped-list module had exactly one filter axis. Both axes independently regression-tested for the "downgrade, don't leak" guarantee.
- **`InvestorProfile` has the identical "verification awareness claimed but never wired up" gap** this phase fixed for `ProviderProfile` — not retroactively fixed (out of scope; that module already shipped its own hardening phase and report).
- **No rate limiting** on the public `GET /service-listings`/`GET /provider-profiles` directories — same standing gap as Job/Investor/Funding public surfaces, extends the existing `BACKLOG.md` entry rather than duplicating it.
