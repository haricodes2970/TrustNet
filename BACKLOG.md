# Backlog

Unresolved / open items across the backend. Delivered work already merged is tracked in [CHANGELOG.md](CHANGELOG.md) and [ROADMAP.md](ROADMAP.md) ("Delivered since backlog was written"). This file lists what's still outstanding, grouped by the roadmap phase it belongs to — see [ROADMAP.md](ROADMAP.md) for full phase descriptions.

> Verify each item against current code before acting — this backlog is compiled from planning docs ([.kilo/plans/](/.kilo/plans/)) and may not reflect fixes already landed.

## Security & stability (Phase 1)

- [ ] Confirm/fix JWT refresh verification secret bug in `src/middlewares/auth.js` (see [SECURITY.md](SECURITY.md))
- [ ] Rate limiting on `/auth/*` routes
- [ ] Lock CORS to explicit origin allowlist (currently `CLIENT_URL` or `*`)
- [ ] Enforce password policy on register/reset/change-password
- [ ] Confirm `.env` gitignored + `.env.example` committed

## RBAC / admin (Phase 2)

- [ ] First-admin bootstrap mechanism (how does the very first admin get created?)

## Code quality (Phase 3)

- [ ] Extract auth route handlers into `authController.js` (currently inline in `auth.routes.js` per survey — confirm)
- [ ] Remove duplication between `queryUtils.js` and `serviceUtils.js`
- [ ] Centralize DTO/response-shape mapping

## Validation & ownership (Phase 4)

- [ ] Audit validator coverage for startup/community/post/collaboration write routes
- [ ] Resolve `resolveUser` auto-creation policy repo-wide (dashboard instance fixed in commit `5909ade`, check other call sites)

## Scalability (Phase 5)

- [ ] Fix N+1 in `getUnreadCount` and per-request user lookups
- [ ] Standardize list-endpoint pagination shape (`{ data, total, page, pageSize }`)
- [ ] Confirm text indexes are used by `searchService.js`
- [ ] Make email/Cloudinary transports singletons instead of per-call

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
- [ ] `downloadUrl`-style public file-serving isn't relevant here, but the analogous gap: `Job`'s public read surface has no rate limiting beyond whatever exists repo-wide (see Security Phase 1 item above) — a public job board is a scraping/enumeration target, worth a dedicated look before production.
- [ ] Publish-time validation (`assertPublishReady`) and draft-time validation (Joi) intentionally differ in strictness — confirmed working as designed via tests, but no product spec defined the exact required-field list (`title`/`description`/`employmentType`/`remotePolicy`) beyond this implementation's own judgment call. Revisit if product has stricter requirements.

## Applications (not fixed this phase)

- [ ] Resume mimetype allowlist (PDF/`.doc`/`.docx`) and file-size cap (5MB) in `application.routes.js` are unreviewed placeholder guesses, no product spec given — same recurring caveat as every prior file-upload route in this repo.
- [ ] Candidate PII/compliance handling (resume retention, right-to-deletion) is unaddressed — a legal/business question outside this implementation's scope, flagged not solved.
- [ ] No cross-Startup "all applications I manage" aggregate listing — staff must supply `?jobId=` explicitly per job. Deliberate scope limit this phase (avoids a speculative aggregate query), revisit if a hiring dashboard needs it.
- [ ] Shared local-storage-directory test cleanup race (Documents + Applications integration tests both `rm` the same directory under `npm run test:all`) — fixed via `fs.rm`'s `maxRetries`/`retryDelay`, but any *third* module reusing `storageService`'s local provider in its own tests will need the same treatment; consider a shared cleanup helper if a third case arises.

## Investors (not fixed this phase — explicit, instructed tradeoff)

- [ ] **Startup authorization currently exists in three local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase, once additional Startup-domain modules exist — not now.
- [ ] `InvestorProfile` and `InvestmentInterest` have no relationship to each other — an investor can express interest without ever creating a profile. Intentional this phase (interest is User-driven, not Profile-driven); confirm against product intent before a future phase changes it.
- [ ] Public `GET /investors` directory has no rate limiting beyond whatever exists repo-wide — same enumeration/scraping concern already flagged for Job's public surface (see Hiring section above).
- [ ] Contributor tier now has three different shapes across three modules (Task: conditional read-write; Application: zero access; Investment Interest: unconditional read-only) — each individually justified in its own module doc, nothing central compares them; worth a note if a fourth shape appears.

## Funding (not fixed this phase — explicit, instructed tradeoffs)

- [ ] **Startup authorization currently exists in four local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`, `fundingRoundService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase, once additional Startup-domain modules exist — not now. This is now the strongest, most-repeated case for that refactor of any module completed so far.
- [ ] **No multi-document transaction around the funding-totals update.** `confirmContribution` performs the status transition and both `$inc` operations as three separate atomic writes, not one transaction — a crash between them could leave `FundingContribution.status: confirmed` with one or both totals not yet incremented. Not resolved this phase (no transaction infrastructure exists anywhere in this codebase, and `mongodb-memory-server`'s default single-node test setup can't exercise real replica-set transactions to verify a fix). Revisit before this handles real financial commitments in production.
- [ ] **`Job`'s and now `FundingRound`'s public GET routes rely on an optional-auth pattern that doesn't exist.** `src/middlewares/auth.js` only exports a hard `authenticate` (401s with no token) — there is no middleware that populates `req.user` when a token is present but doesn't reject when it's absent. Both `jobController`/`fundingRoundController`'s `req.user ? req.user.id : null` branches are consequently unreachable on their public GET routes in production today: an authenticated Startup owner/admin/contributor gets the same public-subset response as an anonymous visitor. Pre-existing gap (Job), now affecting a second module (Funding) — worth an `optionalAuthenticate` middleware in a dedicated pass rather than a third module inheriting it silently.
- [ ] `FundingRound.isArchived` exists on the schema per approved design but has no dedicated archive endpoint this phase — only participates in `getRoundForViewer`'s visibility check and `listRoundsForUser`'s downgrade filter. Add an archive endpoint if/when a product need appears; not speculative-built here.

## Marketplace (not fixed this phase — explicit, instructed tradeoffs)

- [ ] **Startup authorization currently exists in five local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`, `fundingRoundService.resolveStartupAccess`, `engagementRequestService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase, once additional Startup-domain modules exist — not now. This is now the strongest, most-repeated case for that refactor of any module completed so far.
- [ ] **Providers are individual Users, not Startups** — a Startup cannot itself be a service provider in this design. A real capability limit, not just an implementation simplification; confirm against product intent before treating it as permanent.
- [ ] **`ServiceListing.provider` refs `ProviderProfile`, deliberately coupled** — unlike `FundingContribution.investor`/`InvestmentInterest.investor`, which ref `User` directly. A considered inconsistency across modules, not an oversight; worth knowing if a future module needs the same shape.
- [ ] Public `GET /service-listings` directory has no rate limiting beyond whatever exists repo-wide — same enumeration/scraping concern already flagged for Job's/Investor's/Funding's public surfaces.
- [ ] Same optional-auth gap Job and FundingRound already have (`req.user` unpopulated on public GET routes without a token, so "authenticated caller sees more" is unreachable in production) now affects a third module (`service-listings`).

## Analytics (not fixed this phase — explicit, instructed tradeoffs)

- [ ] **Startup authorization currently exists in six local helpers** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, `investmentInterestService.resolveStartupAccess`, `fundingRoundService.resolveStartupAccess`, `engagementRequestService.resolveStartupAccess`, `analyticsService.resolveStartupAccess`). Refactor into a shared authorization service only during a dedicated authorization cleanup phase — not now. This is the strongest, most-repeated case across the entire codebase for that refactor.
- [ ] **No caching/rollup for analytics.** Every request recomputes every count on demand across up to ten collections (`overview`). Fine at current scale; revisit with an `AnalyticsSnapshot`-style periodic-capture collection if query volume against these aggregates grows, or if historical trend data (e.g. funding raised over time) is wanted — current-state fields like `Startup.fundingRaised` can't produce a time series on their own.
- [ ] **No admin/platform-wide analytics surface** — every metric is scoped to one Startup the caller has a role on, per explicit decision this phase. A future cross-tenant reporting surface for the admin role is a distinct, larger authorization question (admin sees everything, not "any role on one Startup"), not addressed here.
- [ ] **No time-to-hire / duration metrics** — deliberately excluded rather than approximated from `updatedAt` deltas, since no status-history log exists in this codebase to compute them correctly.
- [ ] **No dedicated `/analytics/investors` endpoint** — investor metrics are computed (`computeInvestorAnalytics`) and surfaced only via `overview`, per the approved six-endpoint API design. Add a thin route/controller if a dedicated endpoint is wanted later; the compute function already exists.

## Reports (not fixed this phase — explicit, instructed tradeoffs)

- [ ] **PDF export is not implemented.** JSON and CSV shipped this phase; PDF was explicitly deferred rather than guessed at. Two realistic options for a future phase: `pdfkit` (lighter, no Chromium dependency, more manual layout/positioning code to write) vs. Puppeteer (heavier — spins up a headless Chromium instance — but can reuse HTML/CSS templates for layout, likely faster to build a good-looking report). Neither is in `package.json` yet; whichever is chosen is a new dependency and should be picked deliberately in its own review, not defaulted to here.
- [ ] **No rate limiting on report generation** — an authorized owner/admin could repeatedly trigger the `startup` (overview-backed) report's ten-collection aggregation. Same standing gap class as the rest of the codebase's Phase 1 rate-limiting item, not a new one.
- [ ] `reportService.js` reuses `analyticsService.resolveStartupAccess`/`assertAnyRole` rather than a seventh independent copy — an explicit instruction for this phase, and the first module in the Startup-authority duplication chain to *not* add another copy. If the six-duplicate authorization cleanup phase (see prior entries) ever happens, Reports' reuse-based approach should be re-examined too, since it depends on Analytics' helper continuing to exist in its current shape.

## AI (not fixed this phase — explicit, instructed tradeoffs)

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
