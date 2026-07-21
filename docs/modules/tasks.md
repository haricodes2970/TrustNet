# Module: Tasks

Files: `src/routes/task.routes.js`, `src/controllers/taskController.js`, `src/services/taskService.js`, `src/validators/task.validators.js`, `src/models/Task.js`. Built on top of [projects.md](projects.md), which sits on [workspace.md](workspace.md). See [DATABASE.md](../../DATABASE.md#task-taskjs).

## Scope (Sprint 1 Phase 3, amended Phase 4)

Task container only. Documents remains a later phase. **Phase 4 addition:** `Task.milestone` (nullable ref to the new [milestones.md](milestones.md) module) — see that doc's "Task↔Milestone integration" section for full detail; summarized here too since it touches this module's files.

## Routes (`/api/v1/tasks`) — all auth required

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | any resolvable workspace role | create (`projectId` required in body) |
| GET | `/` | any resolvable role | list accessible tasks; optional `?projectId=`, `?assignedTo=` (`me` or a user id) |
| GET | `/:id` | any resolvable role on parent workspace | get one |
| PUT | `/:id` | owner/admin, or contributor on own task | update |
| DELETE | `/:id` | owner/admin, or contributor on own task | archive |

## Controller (`taskController.js`)

`createTask`, `getTask`, `listTasks`, `updateTask`, `archiveTask` — thin, delegates to service. `listTasks` translates `?assignedTo=me` to the caller's own id before passing the filter down.

## Service (`taskService.js`)

`createTask`, `getTaskById`, `assertTaskViewAccess`, `listTasksForUser`, `updateTask`, `archiveTask`. Imports `projectService.getProjectById`/`listProjectsForUser` and `workspaceService.resolveWorkspaceAccess`/`listWorkspaceMembers`. Does not import `workspaceService` for anything Project already exposes, does not import `teamService`/`startupService`, does not query `Team`/`Startup`/`Workspace` models directly.

## Model

`Task`: `project` (ref `Project`, required, indexed — the primary stored relationship), `title`, `description`, `status` enum (`todo`/`in_progress`/`in_review`/`done`/`archived`, default `todo` — business lifecycle only, never used for authorization), `priority` enum (`low`/`medium`/`high`/`urgent`, default `medium`), `assignedTo` (ref `User`, optional), `dueDate`, `createdBy` (ref `User`, required — **creator, audit only, never used for authorization**, deliberately named `createdBy` rather than `owner` to avoid the naming collision flagged in [projects.md](projects.md)), `updatedBy` (ref `User`, audit only), `isArchived`, **`milestone`** (ref `Milestone`, nullable, added Phase 4 — see below).

**No `workspace` field.** Explicit architectural decision: the parent Workspace is resolved through `Project.workspace` on every access check (`projectService.getProjectById`), not denormalized onto Task. Avoids a duplicated relationship; the cost is one extra query per permission check versus a denormalized field — accepted deliberately, revisit only if performance data proves the need.

## Permissions model — first module with contributor write access

Still single source of truth for workspace role: `workspaceService.resolveWorkspaceAccess`. New on top of that: `canMutateTask(task, userId, workspaceRole)` (`serviceUtils.js`) — a pure, DB-independent, second check answering "is this the caller's own task," composed with (not duplicating) workspace-role resolution.

| Action | Owner/Admin | Contributor |
|---|---|---|
| View | ✓ | ✓ |
| Create | ✓ | ✓ — may only self-assign or leave unassigned |
| Update | ✓ (any task) | ✓ only if `createdBy` or `assignedTo` is self |
| Reassign (`assignedTo`) | ✓ (to any workspace member) | can only claim for self, cannot assign to a third party |
| Archive | ✓ (any task) | ✓ only if `createdBy` or `assignedTo` is self |

`assignedTo`, whenever supplied, is validated against `workspaceService.listWorkspaceMembers` — must be an active member of the task's workspace, reused not reimplemented.

`canMutateTask` was extracted into `serviceUtils.js` (alongside `assertOwner`) specifically because it's expected to be reused by future collaboration modules on any resource shaped with `createdBy`/`assignedTo` — not Task-specific in its implementation, only in its current caller.

**Security note carried forward from Projects:** `listTasksForUser` re-verifies `resolveWorkspaceAccess` whenever a caller supplies an explicit `?projectId=` filter, rather than trusting it — same fix pattern already applied in `projectService.listProjectsForUser`.

## Milestone assignment (Phase 4)

`Task.milestone` is **update-only** — `taskCreate` does not declare it, and `taskService.createTask` never reads or persists one, so a task must exist before it can be grouped under a milestone (create → assign, not create-with-milestone). `taskService.updateTask` verifies any supplied `milestone` belongs to the same `project` as the task (`assertMilestoneBelongsToProject`, via `milestoneService.getMilestoneById`) before applying it. No change to Task's permission logic — milestone assignment is gated by the same existing `canMutateTask`/`resolveWorkspaceAccess` check as any other task update, nothing new was added on that axis. Full detail: [milestones.md](milestones.md#taskmilestone-integration-the-one-task-module-change-this-phase).

## Validation

`task.validators.js`: `taskCreate` (`projectId` required, `title` 2–200 required, `description` optional max 5000, `priority` optional enum, `dueDate` optional ISO date, `assignedTo` optional string — **no `milestone` field**), `taskUpdate` (same fields plus `status` optional enum and `milestone` optional string/null, all optional). `.unknown(true)` per repo convention. `project`/`createdBy`/`isArchived` stripped server-side on update; `updatedBy` always server-set.

## Tests

`Main/server/test/task.test.js` — two kinds, both pure/DB-free:
- Joi validator tests (`taskCreate`/`taskUpdate`) — same style as every prior module.
- `canMutateTask` unit tests (owner/admin always mutate; contributor only own-created or own-assigned; no role denies) — the first genuinely novel business-logic unit tests in this codebase beyond validators and `assertOwner`, per your explicit instruction to extract and test it.

`createTask`/`updateTask`/`archiveTask`/`listTasksForUser` (the DB-touching orchestration) remain untested by automation — fourth consecutive module with this gap, restating the standing recommendation for test-DB infra.

## Architectural concerns discovered

- **First module granting non-owner/admin write access.** `canMutateTask` is now load-bearing for preventing contributors from editing/archiving each other's tasks — it's unit-tested in isolation, but the *wiring* (that `taskService` actually calls it before every mutation, with the right `existing` task and resolved role) is not covered by any integration test. Reviewed by code read; flagging the residual risk explicitly rather than presenting it as fully proven.
- **No denormalized `workspace` field means every task permission check costs a Project fetch** (`projectService.getProjectById`) in addition to the Workspace/Team lookups `resolveWorkspaceAccess` already does — three collections touched per check. Accepted per your explicit instruction; revisit if this becomes a measured bottleneck (ties into [ROADMAP.md](../../ROADMAP.md) Phase 5 scalability).
- **`assignedTo` validation adds a further `listWorkspaceMembers` query** on create/update when an assignee is supplied — same no-caching pattern already flagged in [workspace.md](workspace.md) and [projects.md](projects.md), now a third compounding instance.
- **Contributor self-assignment-only rule has no server-side "claim" concept** — a contributor can set `assignedTo` to themselves on an already-assigned task's *unassigned* state only in the sense that `assertAssigneeAllowed` blocks assigning to anyone else, but nothing stops a contributor from clearing someone else's assignment and then claiming it via two separate update calls (unassign requires `canMutateTask` to already pass, which it wouldn't unless they already own/are-assigned the task — so this specific bypass is actually closed, but it's a subtle enough interaction that it's worth a second reviewer's eyes rather than taking my read as final).
