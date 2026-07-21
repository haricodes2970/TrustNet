# Module: Projects

Files: `src/routes/project.routes.js`, `src/controllers/projectController.js`, `src/services/projectService.js`, `src/validators/project.validators.js`, `src/models/Project.js`. Built on top of [workspace.md](workspace.md) — see [DATABASE.md](../../DATABASE.md#project-projectjs).

## Scope (Sprint 1 Phase 2, amended)

Project container only. **Now built upon:** Tasks ([tasks.md](tasks.md)), Milestones ([milestones.md](milestones.md)), and Documents ([documents.md](documents.md)) — all three attach to Project (Tasks and Milestones directly, Documents also directly — Documents are explicitly **not** attached to Workspace or Task, only to Project). No change to any Project file was required for any of the three; each resolves permission independently through `workspaceService.resolveWorkspaceAccess()` via `projectService.getProjectById`, read-only.

## Routes (`/api/v1/projects`) — all auth required

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | workspace owner/admin | create (`workspaceId` in body) |
| GET | `/` | any resolvable workspace role | list projects across accessible workspaces; optional `?workspaceId=` filter |
| GET | `/:id` | any resolvable role on parent workspace | get one |
| PUT | `/:id` | workspace owner/admin | update name/description/status |
| DELETE | `/:id` | workspace owner/admin | archive (soft delete) |

## Controller (`projectController.js`)

`createProject`, `getProject`, `listProjects`, `updateProject`, `archiveProject` — thin, delegates to service.

## Service (`projectService.js`)

`createProject`, `getProjectById`, `assertProjectViewAccess`, `listProjectsForUser`, `updateProject`, `archiveProject`. Imports `workspaceService.resolveWorkspaceAccess` and `workspaceService.listWorkspacesForUser` directly — does **not** import `teamService` or `startupService`, does not query `Team`/`Startup` models. Every permission question resolves through Workspace, once.

## Model

`Project`: `workspace` (ref `Workspace`, required, indexed), `name`, `description`, `status` enum (`planning`/`active`/`on_hold`/`completed`/`archived`, default `planning`), `owner` (ref `User`, required — **creator, audit only**), `updatedBy` (ref `User`, set on every update/archive — audit only), `isArchived` (default `false`). See [DATABASE.md](../../DATABASE.md#project-projectjs).

## Permissions model

**Single source of truth: `workspaceService.resolveWorkspaceAccess`.** Neither `Project.owner` nor `Project.status` is ever read for authorization — both are business/audit fields only.

| Action | Required workspace role |
|---|---|
| View | `owner`, `admin`, or `contributor` |
| Create | `owner` or `admin` only |
| Update | `owner` or `admin` only |
| Archive | `owner` or `admin` only |

Contributors are read-only on Projects in this phase — write access at a finer grain (their own Tasks) is expected to land with the Tasks module, not here.

**Guard:** create/update/archive all reject if the parent `Workspace.isArchived === true` (checked in `assertWorkspaceWriteAccess`, `projectService.js`).

**Security note caught during implementation:** `listProjectsForUser` originally would have let a caller pass an arbitrary `?workspaceId=` and see projects from a workspace they have no access to, since a naive filter merge doesn't re-check permission on an explicit filter value. Fixed by verifying `resolveWorkspaceAccess` on `filter.workspace` before using it, inside the service (not the controller) — so no future caller of `listProjectsForUser` can reintroduce the leak by skipping a controller-side check.

## Validation

`project.validators.js`: `projectCreate` (`workspaceId` required, `name` 2–150 required, `description` optional max 2000, `status` optional enum), `projectUpdate` (same fields, all optional). `.unknown(true)` per repo convention. `workspace`/`owner`/`isArchived` stripped server-side on update; `updatedBy` is set server-side to the acting user, never accepted from the request body.

## Tests

`Main/server/test/project.test.js` — Joi validator unit tests only (pure, no DB), same constraint as [workspace.md](workspace.md#tests) and [teams.md](teams.md#tests). `resolveWorkspaceAccess`-gated service logic remains untested by automation — this is now the **third** module shipping without DB-backed integration coverage.

## Architectural concerns discovered

- **Cascading unverified-permission risk deepens.** Projects is a second consumer of `resolveWorkspaceAccess`'s correctness with zero automated proof. Recommend prioritizing a DB-backed test setup (e.g. `mongodb-memory-server`) before a fourth module (Tasks) stacks on top of the same unverified foundation.
- **No archive-cascade defined.** Archiving a Workspace does not auto-archive its Projects — they simply become unreachable through the normal workspace-access-gated read path (their own `isArchived` flag is untouched). Documented as a deliberate non-decision for now; revisit if Tasks/Milestones need stronger cascade guarantees.
- **`Project.owner` vs `Workspace.owner` naming collision.** Same field name, different meaning (creator vs startup founder). Real risk for whoever builds Tasks next — call this out again in that module's plan.
- **`status` enum is a soft assumption**, modeled loosely on `Startup.stage` — no existing precedent in this codebase for project-lifecycle states. Likely needs revision once Tasks/Milestones can drive status transitions.
