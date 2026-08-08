# Backlog

Unresolved / open items across the backend. Delivered work already merged is tracked in [CHANGELOG.md](CHANGELOG.md) and [ROADMAP.md](ROADMAP.md) ("Delivered since backlog was written"). This file lists what's still outstanding, grouped by the roadmap phase it belongs to — see [ROADMAP.md](ROADMAP.md) for full phase descriptions.

> Verify each item against current code before acting — this backlog is compiled from planning docs ([.kilo/plans/](/.kilo/plans/)) and may not reflect fixes already landed.

## Backend merge (Developer 1 + Developer 2) — not pursued further this phase

An independently-developed TrustNet backend (`trustnet 2.zip`, "Developer 1") was compared against this repo ("Developer 2") for a possible merge. Findings and explicit scope decision:

- Developer 1 had **zero automated tests** (`package.json`: `"test": "echo \"No tests configured yet\""`) versus this repo's 452 passing (unit + integration). Every one of the 12 model names both sides share (`User`, `Job`, `Application`, `Startup`, `Post`, `Comment`, `Community`, `Conversation`, `Message`, `Notification`, `UserPreference`, `CollaborationRequest`) differs in schema between the two — none identical.
- Developer 1 has 22 additional models representing a different product surface entirely: a social graph (`Block`/`Bookmark`/`Connection`/`Follower`/`Reaction`/`Reply`), admin/observability (`AuditLog`/`SystemConfig`/`AppMetric`/`AnalyticsMetric`/`Report`/`Announcement`), email-retry (`EmailToken`/`FailedEmail`), media (`Media`), and a different Startup-membership model (`StartupMember`/`StartupInvitation` instead of this repo's `Team`/`Workspace`). It also ships its own realtime layer (`src/socket/`, needs `socket.io`), background job runner (`src/jobs/`, needs `node-cron`), and its own AI gateway with real provider SDKs (`src/ai/`, needs `openai` + `@google/generative-ai`) — none of which this roadmap ever called for.
- **Explicit decision: none of the above was adopted.** Developer 2's architecture, models, and services were kept wholesale for every domain both backends touch — adopting untested code over tested code, or a second parallel Startup-membership system alongside `Team`, would have regressed correctness and duplicated functionality, both directly prohibited for this merge.
- **Adopted:** `src/middlewares/sanitizer.js` (NoSQL-injection/XSS-at-the-edge sanitization, fixed for Express 5's getter-only `req.query`) and `src/middlewares/rateLimiter.js` + `src/config/rateLimits.js` (`express-rate-limit`-based, `auditLogService` coupling dropped, IPv6 key-generation fixed) — both self-contained, non-duplicative, and each closed a gap this file had already flagged since Phase 1. New dependency: `express-rate-limit@^8.6.0`.
- [ ] If a future phase wants any of Developer 1's social-graph/admin-audit/realtime/background-job/AI-gateway features, treat each as its own new module needing its own planning report — do not re-attempt a bulk absorption; the two codebases' domain models are too structurally divergent for that to be safe.
- [ ] `defaultLimiter`'s 100/15min baseline (from the merge) is generic and repo-wide; several public listing endpoints (Job, Investor, Marketplace) and Reports generation still lack a *dedicated*, tighter, per-surface limit — see their respective sections below.

## Security & stability (Phase 1)

- [x] ~~Confirm/fix JWT refresh verification secret bug in `src/middlewares/auth.js`~~ — fixed (`fix(auth): remove broken refresh-cookie fallback in authenticate/me`): `authenticate`/`GET /me` fell back to reading the refresh cookie but verified it with the access-token secret, which always failed (fail-closed, not exploitable, but dead code). Removed; `/me` now reuses `authenticate` directly. Regression-tested (`authAuthorization.test.js`: "GET /me rejects a refresh cookie presented with no Bearer header").
- [x] ~~Rate limiting on `/auth/*` routes~~ — done via the Developer 1 backend merge: `signupLimiter`/`loginLimiter`/`forgotPasswordLimiter`/`resendVerificationLimiter` on the specific routes, plus a global `defaultLimiter` (100/15min) on all of `/api/v1`. See "Backend merge" section below.
- [ ] Lock CORS to explicit origin allowlist (currently `CLIENT_URL` or `*`)
- [ ] Enforce password policy on register/reset/change-password
- [ ] Confirm `.env` gitignored + `.env.example` committed

## Authentication Completion — Phase 16A: Email OTP + Email Verification (done)

- [x] **Email OTP + Email Verification implemented.** `POST /register` now issues and emails a 6-digit, sha256-hashed, 10-minute-expiring OTP for a new `emailVerified: false` account; `POST /verify-email` (replaces the old `GET` no-op stub) and `POST /resend-verification` (replaces the old no-op stub) are fully implemented, atomic, enumeration-safe, and brute-force-protected (5-attempt per-account lockout + a new 20/15min `emailVerifyLimiter`). See `docs/modules/auth.md` for full behavior.
- [x] ~~Login is not gated on `emailVerified`.~~ — **Phase 16C decision: preserved as-is, by design.** Audited `middlewares/auth.js` directly: login/every-request auth was already, and remains, gated only on `isActive`/`deletedAt` - never on verification state. `accountStatus` is now exposed everywhere for the client to render the right banner/prompt, but has no server-side access-control effect. See `docs/modules/auth.md`'s "Login policy" section.
- [x] ~~Government ID/KYC verification and the admin approval workflow already exist but were unaudited~~ — audited and hardened in Phase 16B (see below). `User` still tracks account state via three independent signals (`emailVerified`, `verificationStatus`/`isVerified`, `isActive`/`deletedAt`) with no unifying `accountStatus` field — **resolved in Phase 16C**: added a fifth, derived `accountStatus` field (`EMAIL_PENDING`/`KYC_PENDING`/`UNDER_REVIEW`/`APPROVED`/`REJECTED`/`RESUBMISSION_REQUIRED`) with no write path of its own; see `docs/modules/auth.md`.
- [ ] `profileController.js`/`settingsController.js` still resolve the acting user via `userService.getUserByEmail(req.user.email)` per request - same pattern fixed in five other call sites across four phases now; still out of scope (not part of the email-verification flow this phase touched).

## Authentication Completion — Phase 16B: Government ID / KYC + Admin Verification Audit (done)

- [x] **Critical: verification documents were publicly exposed via an unauthenticated Cloudinary URL.** Fixed with `type:"authenticated"` uploads + on-demand signed URLs (`verificationDocument.service.js`). See `docs/modules/auth.md`.
- [x] **KYC submission had no `emailVerified` prerequisite, no user-facing audit logging, no submission-confirmation email, and admin decisions had no state guards or race protection.** All fixed - see `docs/modules/auth.md`'s "Government ID / KYC Verification (Phase 16B)" section for the full list.
- [ ] **Oversized-file uploads likely also return a raw 500 (not 400) in the Documents module's own multer usage** - the same root cause fixed for `verification.routes.js` this phase (`MulterError` has no `.statusCode`; the centralized error handler only reads that field). Not fixed there - out of this phase's scope (a different module, already completed in an earlier phase).
- [x] ~~No full verification state-transition matrix.~~ — **Clarified in Phase 16C's audit**: `assertPendingOrIdempotent` already required a *fresh* decision to start from `verificationStatus === "pending"`, which means an admin was never actually able to move directly from `resubmission_requested`/`rejected` to `approved`/`rejected` without a real re-submission in between (that call already 409s). The only genuinely permitted cross-state move is rejecting an already-*approved* account, which is a deliberate, retained capability (new information can surface after approval) - not a gap. `accountStatus`'s transition table in `docs/modules/auth.md` documents this explicitly.
- [ ] **`Startup.verificationDocuments`-equivalent for company-level KYC does not exist** - all verification documents are User-level (individual founder identity), not Startup-level (business registration is one of the *document types* a User can upload, not a separate Startup-level verification flow). Confirmed as the existing, intentional design during this phase's audit, not a gap - noted here only because it wasn't previously documented.

## Authentication Completion — Phase 16C: Unified accountStatus State Machine (done)

- [x] **Unified `accountStatus` field added** (`EMAIL_PENDING`/`KYC_PENDING`/`UNDER_REVIEW`/`APPROVED`/`REJECTED`/`RESUBMISSION_REQUIRED`), derived from existing `emailVerified`/`verificationStatus` via `computeAccountStatus()`, written at every existing transition point (register, OAuth signup, OTP verify, KYC submit, admin approve/reject/request-resubmission). No new transition-guard logic needed - inherits every guard already on the two source fields. `isActive`/`deletedAt` remain fully independent. See `docs/modules/auth.md`.
- [x] **Idempotent backfill script** (`scripts/backfillAccountStatus.js`) for pre-existing users, since a schema `default` doesn't retroactively populate documents created before the field existed.
- [x] **23 new integration tests** (`test/integration/accountStatus.test.js`); full suite 803/803 passing.
- [ ] **`profileController.js`/`settingsController.js`'s duplicated `mapProfileInput` whitelist** (two near-identical, independently-maintained copies - one in each file, with slightly different field lists) was reviewed as part of this phase's mass-assignment audit and confirmed safe (neither includes `accountStatus`), but the duplication itself predates this phase and consolidating it is out of scope (touches the Profile/Settings modules, not Auth). Worth a small dedicated cleanup pass.
- [ ] **OAuth (Google/LinkedIn) signup's `accountStatus` derivation is not covered by an HTTP-level integration test** - consistent with `authAuthorization.test.js`'s existing "OAuth requires a live provider, out of scope" boundary. It reuses the same `computeAccountStatus()` exercised directly and via every other transition path; a provider-mocked test would need OAuth's HTTP flow mocked, which no existing test in this codebase does yet.

## RBAC / admin (Phase 2)

- [ ] First-admin bootstrap mechanism (how does the very first admin get created?)

## Code quality (Phase 3)

- [ ] Extract auth route handlers into `authController.js` (currently inline in `auth.routes.js` per survey — confirm)
- [ ] Remove duplication between `queryUtils.js` and `serviceUtils.js`
- [ ] Centralize DTO/response-shape mapping

## Validation & ownership (Phase 4)

- [x] ~~Audit validator coverage for startup/community/post/collaboration write routes~~ — startup/community already had validators; `post.validators.js` added in the Communities/Posts/Comments/Likes hardening phase (Post had none at all before then).
- [ ] Resolve `resolveUser` auto-creation policy repo-wide — `interactionService.js`'s copy removed in the Communities/Posts/Comments/Likes hardening phase (`authenticate` already guarantees `req.user.id` references a real, persisted User, so the email-lookup-with-silent-create fallback was dead weight at best). `profileController.js` and `settingsController.js` still have their own copies; both are outside that phase's scope (Profile/Settings, not Communities/Posts/Comments/Likes) - revisit in a dedicated Profile/Settings hardening pass.

## Communities + Posts + Comments + Likes (Social hardening phase) — explicit, instructed tradeoffs

- [ ] **No invite/request system for private/restricted Community membership.** Self-join now only works for `type: "public"` (previously ANY authenticated user could self-join a private/restricted community, a real gap); a private/restricted community's membership can only be granted by its owner directly, out-of-band - no endpoint exists for that yet. A real invite flow (mirroring Team's pending/accepted shape) is a distinct, larger feature deliberately not built this phase.
- [ ] **No true concurrency stress test for Like/Community-membership counters.** The atomic aggregation-pipeline update (`$setUnion`/`$filter` + `$size`, single `findByIdAndUpdate` call) is provably race-free per MongoDB's per-document atomicity guarantee, but the test suite verifies correctness via sequential multi-user calls, not literal concurrent requests - `mongodb-memory-server`'s single-node setup make a genuine concurrency race hard to deterministically reproduce in a test.
- [ ] **Mongoose 9 gotcha for future modules:** any `findByIdAndUpdate`/`updateOne` call passed an aggregation-pipeline (array) update **must** pass `{ updatePipeline: true }` explicitly - Mongoose 9 no longer auto-detects an array as a pipeline like older versions did, and throws at call time instead of falling back to a plain update. Caught immediately by this phase's own integration suite (every join/like call 500'd on the first attempt), but worth flagging before another module reaches for this same atomic-counter pattern.
- [ ] **`Post.startup` field exists on the schema and is accepted by the validator, but has no dedicated authorization/visibility treatment** (unlike `Post.community`) - out of scope this phase, which only covered "Community posts"/"Personal posts" per the phase's own VERIFY checklist, not Startup-linked posts specifically.
- [ ] **No notification triggers wired for comment/like/community-join events**, despite `notificationService` already existing and being used elsewhere (Team invites, messages). Reviewed and deliberately not added - no other module completed this session (Job, Application, Investment Interest, Funding, Marketplace) wired notifications from its own domain events either, despite equally plausible cases; treating this module differently would have been scope creep against the session's established pattern, not a fix.

## Scalability (Phase 5)

- [x] ~~Fix N+1 in `getUnreadCount` and per-request user lookups~~ — `getUnreadCount` (Messages) reviewed in the Messaging + Notifications hardening phase: it's already a 2-query shape (`Conversation.find` then `Message.countDocuments` with `$in`), not a real N+1 - no change needed there. The per-request user lookups (`resolveCurrentUserId()` → `userService.getUserByEmail(req.user.email)` on every request) *were* real and fixed in `messageController.js`/`notificationController.js` this same phase (`req.user.id` used directly, like every other controller). `profileController.js`/`settingsController.js` still have their own copies of the same pattern - out of scope for Messaging/Notifications, revisit in a dedicated Profile/Settings pass.
- [ ] Standardize list-endpoint pagination shape (`{ data, total, page, pageSize }`)
- [x] ~~Confirm text indexes are used by `searchService.js`~~ — reviewed in the Search + Recommendations hardening phase: they are **not** used, deliberately. `searchService.js` does regex-based substring matching (`escapeRegex` + case-insensitive `RegExp`), not `$text` queries - a `$text` query would only match tokenized/stemmed terms, breaking the partial/prefix matching ("eag" matching "eagle") this approach supports. `Startup`'s and `Post`'s text indexes go unused by search as a result; changing that would be a search-UX redesign (worse partial-match behavior), not a bug fix, so left as-is. See `docs/modules/search.md`.
- [ ] Make email/Cloudinary transports singletons instead of per-call

## Messaging + Notifications (hardening phase) — explicit, instructed tradeoffs

- [ ] **No dedicated file-upload pipeline for message attachments** - `Message.attachments` stays plain validated URL strings; the client is expected to upload via the Documents module's existing storage path and pass the resulting URL. Building a dedicated messaging-attachment upload flow would be a new feature, not a bug fix - out of scope for an MVP hardening phase (see `docs/modules/messages.md`).
- [ ] **Conversation/Message soft-delete is shared-state, not per-participant.** Any participant deleting a conversation or their own message hides/marks it for everyone (reversible via restore), not just for themselves - matches this codebase's uniform soft-delete convention (every other soft-deletable resource works the same way), deliberately not a new per-user "hide from my inbox only" mechanism, which would be a larger, more speculative feature.
- [ ] `profileController.js`/`settingsController.js` still resolve the acting user via `userService.getUserByEmail(req.user.email)` per request - the same pattern fixed in `messageController.js`/`notificationController.js` (and `interactionService.js`, Communities/Posts phase) this session, but those two files are outside Messaging/Notifications' scope.

## Search + Recommendations (hardening phase) — explicit, instructed tradeoffs

- [ ] **No dedicated rate limiter for `/recommendations`** - authenticated-only (higher abuse barrier than public `/search`, which already has `searchLimiter`), covered by the repo-wide `defaultLimiter` baseline only. Same standing gap class as every other module's public/authenticated listing surface this session (Job, Investor, Funding, Marketplace, Provider directories) - not fixed here either, for consistency.
- [ ] **No user-blocking / "blocked content" feature exists** in this codebase at all (Developer 1's `Block` model was explicitly not adopted during the backend merge - see "Backend merge" section above). Recommendations' "blocked content" checklist item is consequently N/A, not unimplemented.
- [ ] `profileController.js`/`settingsController.js` still resolve the acting user via `userService.getUserByEmail(req.user.email)` per request - same pattern now fixed in five other call sites across three phases (`interactionService.js`, `messageController.js`, `notificationController.js`, `recommendationController.js`); still out of scope (Profile/Settings, not Search/Recommendations).

## Features & DX (Phase 6)

- [ ] Post/message file uploads
- [ ] Follow/connection management
- [ ] Per-user-preference email notification delivery (`UserPreference.emailNotifications` exists on model — confirm it's read anywhere)
- [ ] Full Swagger coverage across all route files
- [x] Integration-test infrastructure — Infrastructure Sprint Phase 1 added `mongodb-memory-server` + `test/integration/` (DB setup/teardown/cleanup helpers, authenticated-test-user helper, `test:integration`/`test:all` npm scripts). See [ROADMAP.md](ROADMAP.md#infrastructure-sprint--phase-1-integration-test-environment).
- [x] Permission integration tests — Infrastructure Sprint Phase 2 covered `resolveWorkspaceAccess`, `canMutateTask` wiring, both list-filter-authorization regressions (Project + Task), and `assertMilestoneBelongsToProject`. Documents phase added `canMutateDocument` coverage + a third list-filter regression. 64 DB-backed integration tests total (59 permission-focused + 5 infra-smoke) across Workspace/Project/Task/Milestone/Document, all passing. Still not covered: `listWorkspaceMembers`'s internal duplicate-fetch behavior (not a correctness bug, a performance one — see Collaboration Architecture Audit §6/§8) and archive/cascade-absence behaviors repo-wide.
- [ ] CI pipeline (none found in repo)
- [ ] Lint/format config (`.eslintrc`, `.prettierrc` — not found in repo)

## Startup Teams (Sprint 1 follow-ups, not fixed this sprint)

- [ ] `email.service.sendEmail` still hard-throws if SMTP isn't fully configured; `teamService.inviteMember` catches and now logs it, but invites still silently succeed with no email sent — no dev-log fallback transport exists
- [ ] No DB-level compound uniqueness on pending invites (`{ team, "members.email" }`) — dedupe is app-level only in `inviteMember`; reviewed this sprint, deferred (schema change was out of scope)
- [ ] `queryUtils.js` still unused dead code — duplication with `serviceUtils.js` confirmed via grep (zero requires), not deleted this sprint (Phase 3 item, out of Sprint 1 scope)

## Documents (not fixed this phase)

- [ ] Storage provider decision — currently local-disk only (`storageService.js`); no S3/Cloudinary/other provider chosen. `downloadUrl()`'s local return value isn't wired to any actual HTTP file-serving route yet.
- [ ] Mimetype allowlist and file-size cap (20MB) in `document.routes.js` are unreviewed placeholder guesses, no product spec given.
- [ ] `resolveDocumentAccess` (`documentService.js`) is a fourth near-identical "fetch parent, resolve workspace access" implementation, alongside `taskService.resolveTaskAccess` and `milestoneService`'s two versions — flagged in the Collaboration Architecture Audit as a P2 refactor candidate (§3/§9), not fixed here, now at 4 instances.
- [ ] `canMutateDocument` and `canMutateTask` are structurally near-identical despite being deliberately kept separate (explicit instruction, not an oversight) — acceptable as designed, but worth knowing if a fifth module wants the same shape.

## Hiring (not fixed this phase — explicit, instructed tradeoffs)

- [ ] **`jobService.resolveStartupAccess()`/`getAccessibleStartupIds()` deliberately duplicate `workspaceService.resolveWorkspaceAccess()`/`listWorkspacesForUser()`'s role-computation logic.** This was an explicit instruction for this phase, not an oversight — the collaboration permission layer is already integration-tested and was left untouched on purpose. A future dedicated refactoring phase should collapse this into one shared primitive both Workspace and Hiring call, the same way `resolveProjectAccess` was already recommended (Collaboration Architecture Audit §9) for Task/Milestone/Documents. This is now the clearest, most justified case for that refactor across the whole codebase.
- [ ] `downloadUrl`-style public file-serving isn't relevant here, but the analogous gap: `Job`'s public read surface has only the generic `defaultLimiter` baseline (100/15min, repo-wide via the Developer 1 merge), no dedicated tighter limit the way `/auth/*`/`/search` now have — a public job board is a scraping/enumeration target, worth a dedicated look before production.
- [ ] Publish-time validation (`assertPublishReady`) and draft-time validation (Joi) intentionally differ in strictness — confirmed working as designed via tests, but no product spec defined the exact required-field list (`title`/`description`/`employmentType`/`remotePolicy`) beyond this implementation's own judgment call. Revisit if product has stricter requirements.

## Applications (not fixed this phase)

- [ ] Resume mimetype allowlist (PDF/`.doc`/`.docx`) and file-size cap (5MB) in `application.routes.js` are unreviewed placeholder guesses, no product spec given — same recurring caveat as every prior file-upload route in this repo.
- [ ] Candidate PII/compliance handling (resume retention, right-to-deletion) is unaddressed — a legal/business question outside this implementation's scope, flagged not solved.
- [ ] No cross-Startup "all applications I manage" aggregate listing — staff must supply `?jobId=` explicitly per job. Deliberate scope limit this phase (avoids a speculative aggregate query), revisit if a hiring dashboard needs it.
- [ ] Shared local-storage-directory test cleanup race (Documents + Applications integration tests both `rm` the same directory under `npm run test:all`) — fixed via `fs.rm`'s `maxRetries`/`retryDelay`, but any *third* module reusing `storageService`'s local provider in its own tests will need the same treatment; consider a shared cleanup helper if a third case arises.

## Investors (not fixed this phase — explicit, instructed tradeoff)

- [ ] **Startup authorization currently exists in three local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase, once additional Startup-domain modules exist — not now.
- [ ] `InvestorProfile` and `InvestmentInterest` have no relationship to each other — an investor can express interest without ever creating a profile. Intentional this phase (interest is User-driven, not Profile-driven); confirm against product intent before a future phase changes it.
- [ ] Public `GET /investors` directory has only the generic `defaultLimiter` baseline, no dedicated tighter limit — same enumeration/scraping concern already flagged for Job's public surface (see Hiring section above).
- [ ] Contributor tier now has three different shapes across three modules (Task: conditional read-write; Application: zero access; Investment Interest: unconditional read-only) — each individually justified in its own module doc, nothing central compares them; worth a note if a fourth shape appears.

## Funding (not fixed this phase — explicit, instructed tradeoffs)

- [ ] **Startup authorization currently exists in four local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`, `fundingRoundService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase, once additional Startup-domain modules exist — not now. This is now the strongest, most-repeated case for that refactor of any module completed so far.
- [ ] **No multi-document transaction around the funding-totals update.** `confirmContribution` performs the status transition and both `$inc` operations as three separate atomic writes, not one transaction — a crash between them could leave `FundingContribution.status: confirmed` with one or both totals not yet incremented. Not resolved this phase (no transaction infrastructure exists anywhere in this codebase, and `mongodb-memory-server`'s default single-node test setup can't exercise real replica-set transactions to verify a fix). Revisit before this handles real financial commitments in production.
- [ ] **`Job`'s and now `FundingRound`'s public GET routes rely on an optional-auth pattern that doesn't exist.** `src/middlewares/auth.js` only exports a hard `authenticate` (401s with no token) — there is no middleware that populates `req.user` when a token is present but doesn't reject when it's absent. Both `jobController`/`fundingRoundController`'s `req.user ? req.user.id : null` branches are consequently unreachable on their public GET routes in production today: an authenticated Startup owner/admin/contributor gets the same public-subset response as an anonymous visitor. Pre-existing gap (Job), now affecting a second module (Funding) — worth an `optionalAuthenticate` middleware in a dedicated pass rather than a third module inheriting it silently.
- [ ] `FundingRound.isArchived` exists on the schema per approved design but has no dedicated archive endpoint this phase — only participates in `getRoundForViewer`'s visibility check and `listRoundsForUser`'s downgrade filter. Add an archive endpoint if/when a product need appears; not speculative-built here.

## Marketplace (Marketplace hardening phase closed most items below; remaining are explicit, instructed tradeoffs)

- [ ] **Startup authorization currently exists in five local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`, `fundingRoundService.resolveStartupAccess`, `engagementRequestService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase, once additional Startup-domain modules exist — not now. This is now the strongest, most-repeated case for that refactor of any module completed so far.
- [ ] **Providers are individual Users, not Startups** — a Startup cannot itself be a service provider in this design. A real capability limit, not just an implementation simplification; confirm against product intent before treating it as permanent.
- [ ] **`ServiceListing.provider` refs `ProviderProfile`, deliberately coupled** — unlike `FundingContribution.investor`/`InvestmentInterest.investor`, which ref `User` directly. A considered inconsistency across modules, not an oversight; worth knowing if a future module needs the same shape.
- [ ] Public `GET /service-listings`/`GET /provider-profiles` directories have only the generic `defaultLimiter` baseline, no dedicated tighter limit — same enumeration/scraping concern already flagged for Job's/Investor's/Funding's public surfaces.
- [ ] **`InvestorProfile` has the same "verification awareness claimed by a design comment but never wired up" gap** the Marketplace hardening phase fixed for `ProviderProfile` (a `verification: { isVerified, verificationStatus }` field on get/list, sourced from `User`). Not retroactively fixed on Investor — that module already shipped its own hardening phase and report; revisit if a future Investor-focused pass happens.
- [x] ~~Same optional-auth gap Job and FundingRound already have... now affects a third module (`service-listings`)~~ — fixed in the Marketplace hardening phase: `optionalAuthenticate` added to `GET /provider-profiles`, `GET /provider-profiles/:id`, `GET /service-listings`, `GET /service-listings/:id`.
- [x] ~~`ServiceListing.isArchived` has no restore endpoint~~ — fixed: `POST /service-listings/:id/restore` added (owner or platform admin; blocked for non-admins while `deletedAt` is set by admin moderation).
- [x] ~~No platform-admin override on ProviderProfile/ServiceListing/EngagementRequest~~ — fixed: `isAdmin` threaded through every mutation and view/list path in all three services.
- [x] ~~No duplicate-title validation on ServiceListing~~ — fixed: `assertNoDuplicateTitle`, case-insensitive, per-provider, active-listings-only.
- [x] ~~`engagementRequestService.createRequest` never checked the requesting Startup's own state (deleted/suspended/not-active)~~ — fixed: `assertStartupAcceptingEngagement`, same shape as Investment Interest/Funding's equivalent guards.
- [x] ~~No mechanism at all for "archived provider"/"deleted provider" edge cases~~ — fixed by reusing `User.isActive`/`deletedAt` (no new field on `ProviderProfile`): concealed from ProviderProfile get/list, ServiceListing get/list, and blocks new EngagementRequests.

## Analytics (Analytics + Reports + AI hardening phase closed the two critical items below; remaining are explicit, instructed tradeoffs)

- [x] ~~**Critical, previously unknown: `computeHiringAnalytics`/`computeInvestorAnalytics`/`computeMarketplaceAnalytics` returned zero for every real HTTP request.**~~ `Model.aggregate()`'s `$match` stage doesn't get Mongoose's automatic string→ObjectId casting the way `.find()` does; these three functions matched against the raw `startupId` string every real request sends. Fixed by passing `startup._id` (a real ObjectId, already fetched by `assertAnyRole`) into every compute function instead. Transitively fixed the same bug in Reports and AI with no changes to either file. See `docs/modules/analytics.md`.
- [x] ~~A malformed `startupId` produced a raw 500 (Mongoose `CastError` with no `statusCode`)~~ — now a clean `ApiError(400, "Invalid startupId.")`, fixed once in `assertAnyRole`.
- [ ] **Startup authorization currently exists in six local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`, `fundingRoundService.resolveStartupAccess`, `engagementRequestService.resolveStartupAccess`, `analyticsService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase — not now. This is the strongest, most-repeated case across the entire codebase for that refactor.
- [ ] **No caching/rollup for analytics.** Every request recomputes every count on demand across up to ten collections (`overview`). Fine at current scale; revisit with an `AnalyticsSnapshot`-style periodic-capture collection if query volume against these aggregates grows, or if historical trend data (e.g. funding raised over time) is wanted — current-state fields like `Startup.fundingRaised` can't produce a time series on their own.
- [ ] **No admin/platform-wide analytics surface** — every metric is scoped to one Startup the caller has a role on, per explicit decision this phase. A future cross-tenant reporting surface for the admin role is a distinct, larger authorization question (admin sees everything, not "any role on one Startup"), not addressed here.
- [ ] **No time-to-hire / duration metrics** — deliberately excluded rather than approximated from `updatedAt` deltas, since no status-history log exists in this codebase to compute them correctly.
- [ ] **No dedicated `/analytics/investors` endpoint** — investor metrics are computed (`computeInvestorAnalytics`) and surfaced only via `overview`, per the approved six-endpoint API design. Add a thin route/controller if a dedicated endpoint is wanted later; the compute function already exists.

## Reports (Analytics + Reports + AI hardening phase added audit logging, closed below; remaining are explicit, instructed tradeoffs)

- [x] ~~**No audit logging existed**~~, despite being an explicit requirement for this module — `reportController.js` now logs a `report.generate` entry on every successful generation. See `docs/modules/reports.md`.
- [ ] **PDF export is not implemented.** JSON and CSV shipped this phase; PDF was explicitly deferred rather than guessed at. Two realistic options for a future phase: `pdfkit` (lighter, no Chromium dependency, more manual layout/positioning code to write) vs. Puppeteer (heavier — spins up a headless Chromium instance — but can reuse HTML/CSS templates for layout, likely faster to build a good-looking report). Neither is in `package.json` yet; whichever is chosen is a new dependency and should be picked deliberately in its own review, not defaulted to here.
- [ ] **No rate limiting on report generation** — an authorized owner/admin could repeatedly trigger the `startup` (overview-backed) report's ten-collection aggregation. Same standing gap class as the rest of the codebase's Phase 1 rate-limiting item, not a new one.
- [ ] `reportService.js` reuses `analyticsService.resolveStartupAccess`/`assertAnyRole` rather than a seventh independent copy — an explicit instruction for this phase, and the first module in the Startup-authority duplication chain to *not* add another copy. If the six-duplicate authorization cleanup phase (see prior entries) ever happens, Reports' reuse-based approach should be re-examined too, since it depends on Analytics' helper continuing to exist in its current shape.

## AI (not fixed this phase — explicit, instructed tradeoffs; transitively fixed via Analytics, see above)

- [ ] **No real LLM provider is wired.** `aiProviderService.generateCompletion()` ships with a deterministic, no-network default (echoes its inputs, no external call, no new dependency). Two realistic options for a future phase: a direct SDK integration (e.g. `openai`/`@anthropic-ai/sdk` — a new `package.json` dependency, requires an API key in `.env`, real per-token cost) vs. a provider-agnostic gateway/proxy if one is already used elsewhere in the org. Neither is chosen here — should be its own deliberate decision in review, not defaulted.
- [ ] **Rate limiting is in-memory, per-process, not persisted.** `RATE_LIMIT_MAX_REQUESTS`/`RATE_LIMIT_WINDOW_MS` in `aiService.js` reset on restart and are not shared across multiple server instances — each instance would enforce its own independent limit rather than one true per-user limit. Fine for a single-instance MVP; needs a shared store (Redis or similar) before a multi-instance deployment, especially once a real (costed) LLM provider is wired in.
- [ ] **Prompt-injection and hallucination risk are currently dormant** because the default provider doesn't actually interpret text — it only echoes it. Both risks become real the moment a real LLM provider is wired in. Re-review `aiService.js`'s `SAFETY_PREAMBLE`/context-delimiting approach specifically at that point; it was designed for this eventuality but has never been tested against an actual model that could ignore it.
- [ ] `taskService.js` (and other pre-`ApiError`-convention services — Project/Workspace/Milestone/Document/Team) still throw plain `Error` for authorization failures in places. `aiService.gatherTaskPrioritizationContext` has one narrow catch-and-normalize for this; any future AI capability that reuses another legacy plain-`Error` service will need the same narrow treatment, not a broad fix (out of scope — those service files are not touched per standing policy).

## Documentation

- [ ] Reconcile root [README.md](README.md) claim of a "repository" layer — not present in `src/`, services call Mongoose models directly (see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Add sequence diagram to [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md)
- [ ] Formal security disclosure process (see [SECURITY.md](SECURITY.md))

## Open design questions

See [ROADMAP.md](ROADMAP.md#open-questions-from-backlog-appendix-b) — OAuth provisioning policy, session model (JWT-only vs persistent), real-time messaging transport, admin moderation scope, release branching model.
