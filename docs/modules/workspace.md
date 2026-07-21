# Module: Workspace

Files: `src/routes/workspace.routes.js`, `src/controllers/workspaceController.js`, `src/services/workspaceService.js`, `src/validators/workspace.validators.js`, `src/models/Workspace.js`. Foundation module for the future Projects/Tasks/Milestones/Documents modules — see [ARCHITECTURE.md](../../ARCHITECTURE.md), [DATABASE.md](../../DATABASE.md#workspace-workspacejs). Reuses [teams.md](teams.md) and [startups.md](startups.md) for permission resolution — does not modify either.

## Scope (Phase 1)

Model, CRUD, membership projection, permission resolution only. Projects, Tasks, Milestones, Documents are later phases, not implemented here.

## Routes (`/api/v1/workspaces`) — all auth required

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | startup founder | create workspace (one per startup — errors if one already exists) |
| GET | `/` | owner or Team member | list workspaces current user can access |
| GET | `/:id` | owner/admin/contributor | get one workspace |
| PUT | `/:id` | owner/admin | update name/description/settings |
| DELETE | `/:id` | owner only | archive (soft delete) |
| GET | `/:id/members` | owner/admin/contributor | derived read-only projection: founder + mapped Team roster |

## Controller (`workspaceController.js`)

`createWorkspace`, `getWorkspace`, `listWorkspaces`, `updateWorkspace`, `archiveWorkspace`, `listMembers` — thin, parses `req`, delegates to service, shapes response. Same pattern as `teamController.js`.

## Service (`workspaceService.js`)

`createWorkspace`, `getWorkspaceById`, `listWorkspacesForUser`, `updateWorkspace`, `archiveWorkspace`, `listWorkspaceMembers`, `resolveWorkspaceAccess`.

Queries the `Team` model **directly** (`require("../models/Team")`) rather than going through `teamService.js` — an explicit architectural choice to keep Workspace independent of the Teams module's service layer (no cross-module service coupling). Same for `Startup` (`assertStartupFounder` queries the `Startup` model directly, mirroring the pattern already used in `teamService.assertStartupOwner`).

## Model

`Workspace`: `startup` (ref `Startup`, **required, unique** — enforces exactly one workspace per startup at the DB layer, not just app-level), `name`, `description`, `owner` (ref `User`, denormalized from `Startup.founder` at creation), `settings.defaultVisibility` (enum `private`/`team`, default `team`), `isArchived` (default `false`), timestamps. See [DATABASE.md](../../DATABASE.md#workspace-workspacejs).

## Permissions model

Two-tier, computed on every request — nothing stored on the workspace document itself beyond `owner`:

| Tier | Source | Role returned by `resolveWorkspaceAccess` |
|---|---|---|
| Startup founder | `Workspace.owner` (denormalized `Startup.founder`) | `owner` |
| Active Team member, `role: admin` | `Team.members[]` (queried by `Workspace.startup`) | `admin` |
| Active Team member, `role: member` | `Team.members[]` | `contributor` |
| No Team exists, not the founder | — | `null` (no access) |

`resolveWorkspaceAccess(workspaceId, userId)` does its own DB fetch (workspace + team) and returns `{ role }` in one call — **no separate pure/impure split** (`computeWorkspaceRole()` was explicitly rejected as premature abstraction; if a second module needs the same logic, extract then, not now).

No separate Workspace invite/membership-mutation endpoints — membership changes happen exclusively via the existing `POST/PUT/DELETE /api/v1/teams/:id/members*` routes ([teams.md](teams.md)). `GET /:id/members` is read-only, derived at request time.

## Validation

`workspace.validators.js`: `workspaceCreate` (`startupId` required, `name` 2–100 required, `description` optional max 2000, `settings.defaultVisibility` optional enum), `workspaceUpdate` (same fields, all optional). `.unknown(true)` per repo convention. `startup`/`owner`/`isArchived` are stripped from the update payload server-side in `updateWorkspace`, same pattern as `teamService.updateTeam`.

## Tests

`Main/server/test/workspace.test.js` — unit tests for the Joi validators only (pure, no DB): valid/invalid payloads, required-field and enum rejection. `resolveWorkspaceAccess`, `createWorkspace`, and every other DB-touching service function are **not** unit-tested — no DB-backed test infra exists in the repo (same gap already flagged in [BACKLOG.md](../../BACKLOG.md) and [docs/modules/teams.md](teams.md#tests)). Run via `npm test` in `Main/server`.

## Architectural notes / concerns

- Workspace's independence from `teamService.js` (querying `Team` model directly) means the Team-role-mapping logic (`admin`→`admin`, `member`→`contributor`) now exists in two places conceptually — once as raw `Team.members[].role` data, once as the workspace-role mapping in `resolveWorkspaceAccess`. Acceptable for one module; if a third module needs the same mapping, extract a shared helper then rather than duplicating a third time.
- `resolveWorkspaceAccess` re-queries `Workspace` and `Team` from scratch on every call — no caching. Fine at current scale, revisit under [ROADMAP.md](../../ROADMAP.md) Phase 5 (scalability) if Workspace-gated modules (Projects/Tasks) create request-volume pressure.
- 1:1 startup↔workspace is enforced by a unique index (DB-level, race-safe), not just the app-level existence check in `createWorkspace` — the app check exists purely to return a friendlier error message before hitting the DB constraint.
- This module is the permission foundation for Projects/Tasks/Milestones/Documents. Its correctness matters disproportionately to its own size — flagging (again) that it currently has zero DB-backed integration test coverage, same limitation noted in [docs/modules/teams.md](teams.md#tests).
