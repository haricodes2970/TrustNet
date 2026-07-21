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

## Documentation

- [ ] Reconcile root [README.md](README.md) claim of a "repository" layer — not present in `src/`, services call Mongoose models directly (see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Add sequence diagram to [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md)
- [ ] Formal security disclosure process (see [SECURITY.md](SECURITY.md))

## Open design questions

See [ROADMAP.md](ROADMAP.md#open-questions-from-backlog-appendix-b) — OAuth provisioning policy, session model (JWT-only vs persistent), real-time messaging transport, admin moderation scope, release branching model.
