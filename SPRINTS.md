# Sprints

Sprint-level tracking for TrustNet backend work. This maps the phased plan in [ROADMAP.md](ROADMAP.md) to a sprint cadence. No sprint-tracking tool (Jira/Linear) reference was found in the repo — TODO: add one to [TEAM.md](TEAM.md) references once the team adopts a tracker.

## How sprints map to phases

Each roadmap phase (see [ROADMAP.md](ROADMAP.md)) is scoped to run on its own branch and is treated as one sprint / work block:

| Sprint | Roadmap phase | Branch | Focus |
|---|---|---|---|
| Sprint 1 | Phase 1 | `stabilize/phase-1-security-fixes` | Security & stability fixes |
| Sprint 2 | Phase 2 | `feat/phase-2-admin-rbac` | RBAC, admin, verification |
| Sprint 3 | Phase 3 | `refactor/phase-3-code-quality` | Code quality refactor |
| Sprint 4 | Phase 4 | `feat/phase-4-validation-ownership` | Validation & ownership |
| Sprint 5 | Phase 5 | `perf/phase-5-scalability` | Scalability & performance |
| Sprint 6 | Phase 6 | `feat/phase-6-features-dx` | Missing features & DX |

## Definition of Done (per sprint)

Copied from each phase in [ROADMAP.md](ROADMAP.md) — see that file for the authoritative per-phase DoD checklist. General bar for every sprint:

- Code builds (`npm run build` in `Main/server`).
- Manual test pass against [docs/MANUAL_TESTING_CHECKLIST.md](docs/MANUAL_TESTING_CHECKLIST.md) for touched areas.
- Swagger (`/api/docs`) updated for any new/changed routes.
- Relevant doc in [docs/modules/](docs/modules/) or root docs updated.
- PR follows [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/PULL_REQUEST_TEMPLATE.md](docs/PULL_REQUEST_TEMPLATE.md).

## Workflow within a sprint

See [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) for the daily update format (Yesterday/Today/Blockers/PR-Issue) and branch/PR process, and [docs/GITHUB_HELP.md](docs/GITHUB_HELP.md) for branch naming and commit conventions.

## Per-developer sprints (distinct from the phase-sprint table above)

The table above maps whole-team roadmap phases to sprint numbers. Individual developers also run their own numbered "Sprint 1", "Sprint 2", etc. scoped to their ownership area — these are a separate axis, not a 1:1 mapping to the phase table. Track them here as they land.

### Backend Developer 2 — Sprint 1: Startup Teams hardening

Scope: harden the existing Startup Teams module only (no new endpoints/schema). Approved plan executed:

- [x] Extract duplicated ownership checks into shared `assertOwner` helper (`serviceUtils.js`), applied in `teamService.js` (5 call sites) and `startupController.js` (2 call sites)
- [x] `teamService.inviteMember` reuses `userService.getUserByEmail` instead of querying `User` model directly
- [x] Swallowed notify/email failures in `inviteMember` now logged via `console.error`
- [x] Notifications added for accept-invite, remove/leave-member, and role-change (previously only invite fired one)
- [x] Verified `Team` model's invite-uniqueness gap — decided to leave as app-level dedupe, no schema change (documented in [docs/modules/teams.md](docs/modules/teams.md))
- [x] Swagger descriptions added to accept/remove/role-change routes noting the new notification side-effects
- [x] Unit tests added (`test/serviceUtils.test.js`, `assertOwner`), `npm test` wired to `node --test` (was a no-op)
- [x] `npm run build` verified passing after changes

DoD met: builds clean, unit tests pass, no route/schema/status-code-contract changes, docs updated ([ROADMAP.md](ROADMAP.md#sprint-1-backend-developer-2--startup-teams-hardening), [BACKLOG.md](BACKLOG.md), [CHANGELOG.md](CHANGELOG.md), [docs/modules/teams.md](docs/modules/teams.md)). Not done: no DB-backed integration tests (no test-DB infra in repo — flagged as follow-up, not this sprint's scope).

## Current state

Per commit history, work resembling Phase 2 (admin/verification/RBAC) and parts of Phase 6 (Startup Teams feature) has already landed. TODO: reconcile actual sprint completion against [ROADMAP.md](ROADMAP.md) with the team — this file describes the intended cadence, not a live burndown. No velocity/story-point data exists in the repo to report here.
