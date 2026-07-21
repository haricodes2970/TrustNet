# Roadmap

Phased plan for backend stabilization and features, sourced from [.kilo/plans/1784096125148-backend-stabilization-backlog.md](.kilo/plans/1784096125148-backend-stabilization-backlog.md) and [.kilo/plans/1784538942522-backend-feature-reorg-plan.md](.kilo/plans/1784538942522-backend-feature-reorg-plan.md). For granular status/estimates see [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md). For sprint breakdown see [SPRINTS.md](SPRINTS.md). For unresolved items see [BACKLOG.md](BACKLOG.md).

> Status column reflects what's inferable from the codebase at doc-writing time. Verify against current code/commits before treating an item as done — plans describe intent, not confirmed state.

## Phase 1 — Security & Stability Fixes

Branch: `stabilize/phase-1-security-fixes`

| Item | Notes |
|---|---|
| Fix JWT refresh bug | auth middleware allegedly verifies refresh cookie against access secret — see [SECURITY.md](SECURITY.md) |
| Secrets hygiene | `.env` gitignored, `.env.example` committed, validate `TWO_FACTOR_ENCRYPTION_KEY` |
| Remove DNS override in `server.js` | commit `ea9a895` addresses this |
| Rate limiting on `/auth/*` | not found in current middleware stack |
| Lock down CORS | currently `CLIENT_URL` or `*` fallback |
| Password policy enforcement | register/reset/change-password |

**DoD:** refresh-cookie requests pass auth; CORS locked; rate limiter active; password policy enforced.

## Phase 2 — RBAC + Admin + Verification

Branch: `feat/phase-2-admin-rbac`

`authorize(...roles)` middleware, `/admin` routes, verification approve/reject, auth guards on write routes, first-admin bootstrap. Commits `3e1c6fc feat(admin): add verification approval workflow` and `cbe98e3 fix(security): prevent self-assignment of admin role` indicate this phase is substantially implemented — verify remaining scope (first-admin bootstrap) against code.

## Phase 3 — Code Quality Refactor

Branch: `refactor/phase-3-code-quality`

Extract auth handlers to `authController.js`, standardize `next(err)` + `ApiError` usage, remove dead code (`queryUtils.js` duplication with `serviceUtils.js`), centralize DTO mapping.

## Phase 4 — Validation & Ownership

Branch: `feat/phase-4-validation-ownership`

Validators for startup/community/post/collaboration (some exist in `src/validators/` — confirm coverage), wire `validate(schema)` everywhere, ownership checks in services, resolve `resolveUser` auto-creation policy (commit `5909ade fix(dashboard): remove dashboard auto user creation` addresses part of this).

## Phase 5 — Scalability & Performance

Branch: `perf/phase-5-scalability`

Fix N+1 queries (`getUnreadCount`, per-request user lookups), standardize pagination (`{ data, total, page, pageSize }`), text indexes for search, singleton email/Cloudinary transports, optional retention job for messages/notifications.

## Phase 6 — Missing Features & DX

Branch: `feat/phase-6-features-dx`

Session management (list/revoke — routes exist in `settings.routes.js`, verify implementation), file uploads for posts/messages, community membership (join/leave — implemented per routes), follow/connections, per-preference email notifications, full Swagger coverage, test suite + CI + lint config, README accuracy.

## Sprint 1 (Backend Developer 2 — Startup Teams hardening)

Completed: shared `assertOwner` ownership helper (`serviceUtils.js`), collapsing 6 duplicated inline ownership checks across `teamService.js` and `startupController.js`; `teamService.inviteMember` now reuses `userService.getUserByEmail` instead of querying `User` directly; swallowed notify/email failures in `inviteMember` now logged; notifications added for accept/remove/role-change (previously only invite notified). No route, schema, or status-code-contract changes. Full detail: [docs/modules/teams.md](docs/modules/teams.md#ownership-enforcement-sprint-1-hardening). See [SPRINTS.md](SPRINTS.md) for sprint-level tracking.

## Workspace Module — Phase 1 (Backend Developer 2)

Model, CRUD, membership projection, and permission resolution implemented — foundation for future Projects/Tasks/Milestones/Documents modules. `Workspace.startup` is unique (DB-enforced, exactly one workspace per startup). Access resolved live via `resolveWorkspaceAccess` against `Startup.founder` (owner tier) and `Team.members` (admin/contributor tiers, queried directly against the `Team` model — no `teamService` coupling, by explicit design decision). No invite/membership-mutation endpoints on Workspace — reuses existing Team invite flow. Projects/Tasks/Milestones/Documents are explicitly out of scope for this phase. Full detail: [docs/modules/workspace.md](docs/modules/workspace.md).

## Projects Module — Sprint 1 Phase 2 (Backend Developer 2)

Project container built on top of Workspace: model, CRUD, permission enforcement. All authorization derives exclusively from `workspaceService.resolveWorkspaceAccess()` — `Project.owner` (creator) and `Project.status` (business lifecycle) are explicitly never consulted for permissions, audit/business fields only. `updatedBy` added for audit trail on every mutation. Caught and fixed a permission-bypass risk during implementation: `listProjectsForUser` now re-verifies access on an explicit `?workspaceId=` filter instead of trusting it. No modifications to Startup/Team/Workspace modules. Tasks/Milestones/Documents remain out of scope. Full detail: [docs/modules/projects.md](docs/modules/projects.md).

## Tasks Module — Sprint 1 Phase 3 (Backend Developer 2)

Task container built on top of Project (no denormalized Workspace ref — resolved through Project on every check, deliberate choice). First module granting non-owner/admin write access: `canMutateTask()` (new pure helper in `serviceUtils.js`, unit-tested, reusable by future collaboration modules) composes with `workspaceService.resolveWorkspaceAccess()` — contributors may mutate only tasks they created or are assigned to; owner/admin unrestricted. `assignedTo` validated against `listWorkspaceMembers`; contributors may only self-assign. No modifications to Startup/Team/Workspace/Project modules. Milestones/Documents remain out of scope. Full detail: [docs/modules/tasks.md](docs/modules/tasks.md).

## Milestones Module — Sprint 1 Phase 4 (Backend Developer 2)

Milestone container built on top of Project — structural planning entity, owner/admin-only permissions (contributors participate through Tasks, not Milestones), resolved via the same `workspaceService.resolveWorkspaceAccess()` mechanism Project already uses. First phase requiring a Task-module change: `Task.milestone` (nullable ref, **update-only** — not settable at creation, workflow is create-task-then-assign), with an integrity check ensuring the milestone belongs to the task's project. Task's existing permission logic (`canMutateTask`) untouched. Full existing test suite re-verified passing after the Task edits — no regression. No modifications to Startup/Team/Workspace/Project. Documents remains out of scope. Full detail: [docs/modules/milestones.md](docs/modules/milestones.md).

## Infrastructure Sprint — Phase 1: Integration-test environment

Introduced `mongodb-memory-server`-backed integration testing, in response to the Collaboration Architecture Audit's finding of zero DB-backed test coverage. No Jest in this repo (confirmed) — infrastructure built on the existing `node --test` runner instead, no new test framework introduced. New: `Main/server/test/integration/` (helpers for DB setup/teardown/cleanup and authenticated-test-user creation), `npm run test:integration` and `npm run test:all` scripts, `npm test` (unit-only) unchanged and re-verified passing (37/37). One infra-smoke-test file proves the harness works end-to-end (DB connects, writes/reads, cleans up between tests, issues a token `auth.js` can verify) — deliberately contains **no** collaboration-permission tests, per explicit scope for this phase. Full detail: [Main/server/test/integration/README.md](Main/server/test/integration/README.md). Next: actual permission integration tests, in the order the audit recommended (`resolveWorkspaceAccess` first).

## Documents Module (Backend Developer 2)

Document upload/metadata/access-control built on top of Project (`Workspace → Project → Document`, never attached to Workspace or Task directly, per explicit design decision). New `storageService.js` abstraction (`upload`/`downloadUrl`/`remove`) with a local-disk default provider — no external provider chosen this phase, same "most appropriate equivalent without inventing infra" reasoning as the `node --test`/`mongodb-memory-server` calls in the two prior infrastructure phases. No delivery URL is ever persisted — generated on demand on every read. New dedicated `canMutateDocument()` helper (explicitly not a reuse of `canMutateTask()`, per instruction) — owner/admin manage any document, contributor may only mutate documents they uploaded. 20 new integration tests (reusing the existing `createCollaborationFixture()`, no new fixture) + 11 new unit tests, all passing (112/112 combined with pre-existing suite). One test-authoring mistake caught and fixed during development (archived-workspace vs archived-project guard confusion) — not a production bug, documented in [docs/modules/documents.md](docs/modules/documents.md). No modifications to Startup/Team/Workspace/Project/Task/Milestone. Versioning, previews, OCR, comments, folders, collaborative editing, and sharing explicitly out of scope. Full detail: [docs/modules/documents.md](docs/modules/documents.md).

## Hiring Module (Backend Developer 2)

Job postings built directly on Startup — no Workspace/Project/Documents dependency, first module with a genuinely public (unauthenticated) read surface. `jobService.js` implements its own `resolveStartupAccess()`/`getAccessibleStartupIds()`, a **deliberate, explicitly-instructed duplication** of `workspaceService.resolveWorkspaceAccess()`'s role logic — not extracted into a shared primitive, since the collaboration permission layer is already integration-tested and stays untouched until a dedicated future refactoring phase. Owner/admin manage jobs fully; contributors read-only (draft and published); public sees published-and-non-archived only, with unpublished jobs returning 404 (not 403) to conceal existence. List endpoint uses a "downgrade to public subset" pattern for unauthorized filters, not outright rejection — a different shape than every prior module's list-filter fix. New `createStartupTeamFixture()` test helper proves Workspace/Project independence by construction. 27 new integration tests + 11 new unit tests, 150/150 combined passing. No modifications to Startup/Team/Workspace/Project/Task/Milestone/Document. Full detail: [docs/modules/hiring.md](docs/modules/hiring.md).

## Applications Module (Backend Developer 2)

Job applications built on Hiring (`Startup → Job → Application`), reusing `jobService`/`storageService` directly — no `Document` model/`documentService`, no new duplicated Startup-authority logic (unlike Hiring, Applications correctly reuses `jobService.resolveStartupAccess` rather than reimplementing it a third time). First module with a third distinct authority shape: flat candidate-ownership (`applicant === userId`, no role resolution) alongside the reused owner/admin tier — contributor gets explicitly zero access (not read-only, unlike Job's contributor tier), and there's no public tier at all. First module with per-viewer field redaction (`notes` hidden from the candidate). Status lifecycle enforced by a pure, unit-tested state machine (`assertValidStatusTransition`) — no skip-ahead, staff-reject-from-anywhere, candidate-withdraw-from-anywhere, terminal states immutable. Duplicate-application prevention via both an app-level check and a DB-level partial unique index (`{job,applicant}`, excluding `withdrawn`). Dedicated `PUT /:id/resume` and `PUT /:id/cover-letter` endpoints replace a generic update, per instruction. One test-infra concurrency bug found and fixed (shared local-storage-directory cleanup race between this module's and Documents' integration tests under `npm run test:all`) — not a production bug, verified stable across repeated full-suite runs. 28 new integration tests + 12 new unit tests, 190/190 combined passing. No modifications to Startup/Team/Workspace/Project/Task/Milestone/Documents/Job service files. Full detail: [docs/modules/applications.md](docs/modules/applications.md).

## Delivered since backlog was written (per commit history)

- `feat(startup): secure startup management` (`135e7d3`)
- `feat(dashboard): add recent startups widget` (`c5a41d7`)
- `feat(dashboard): add trending posts widget` (`1a9c68f`)
- Startup Teams module (`src/models/Team.js`, `teamController.js`, `teamService.js`, `team.routes.js`, `team.validators.js`) — see [.kilo/plans/1784538942522-backend-feature-reorg-plan.md](.kilo/plans/1784538942522-backend-feature-reorg-plan.md) and [docs/modules/teams.md](docs/modules/teams.md)

## Open questions (from backlog Appendix B)

1. OAuth user provisioning: pre-create at login vs require explicit registration?
2. Token/session model: stateless JWT-only vs persistent Session + Redis?
3. Real-time messaging: WebSocket vs SSE vs polling?
4. Admin scope: which entities need moderation beyond verification?
5. Release flow: feature-branch-per-phase PR vs trunk-direct?

TODO: no target dates found for phases beyond the original team deadline in [docs/ROLES.md](docs/ROLES.md) (17 July, year unspecified in source doc). Confirm current milestones with team lead.
