# Module: Milestones

Files: `src/routes/milestone.routes.js`, `src/controllers/milestoneController.js`, `src/services/milestoneService.js`, `src/validators/milestone.validators.js`, `src/models/Milestone.js`. Built on top of [projects.md](projects.md); groups [tasks.md](tasks.md). See [DATABASE.md](../../DATABASE.md#milestone-milestonejs).

## Scope (Sprint 1 Phase 4)

Milestone container only. Documents remains a later phase.

## Routes (`/api/v1/milestones`) — all auth required

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | workspace owner/admin | create (`projectId` required in body) |
| GET | `/` | any resolvable role | list accessible milestones; optional `?projectId=` |
| GET | `/:id` | any resolvable role | get one |
| PUT | `/:id` | owner/admin | update |
| DELETE | `/:id` | owner/admin | archive |

**No `/:id/tasks` endpoint.** `GET /api/v1/tasks?milestone=<id>` already works once `Task.milestone` exists — `taskService.listTasksForUser` spreads arbitrary filter keys through to `Task.find()` after establishing the accessible-projects guard. Reused, not duplicated.

## Controller (`milestoneController.js`)

`createMilestone`, `getMilestone`, `listMilestones`, `updateMilestone`, `archiveMilestone` — thin, delegates to service.

## Service (`milestoneService.js`)

`createMilestone`, `getMilestoneById`, `assertMilestoneViewAccess`, `listMilestonesForUser`, `updateMilestone`, `archiveMilestone`. Imports `projectService.getProjectById`/`listProjectsForUser` and `workspaceService.resolveWorkspaceAccess`. Does not import `teamService`/`startupService`/`taskService`, does not query `Team`/`Startup`/`Workspace`/`Task` models directly.

## Model

`Milestone`: `project` (ref `Project`, required, indexed), `title`, `description`, `dueDate`, `status` enum (`planned`/`in_progress`/`completed`/`missed`/`archived`, default `planned` — business lifecycle only, never used for authorization), `createdBy` (ref `User`, required — audit only), `updatedBy` (ref `User`, audit only), `isArchived`.

## Permissions model

Milestones are **structural planning entities, like Project — owner/admin manage them, contributors are read-only.** Explicit design decision (confirmed, not a default): contributors participate through Tasks, not Milestones.

| Action | Owner/Admin | Contributor |
|---|---|---|
| View | ✓ | ✓ |
| Create | ✓ | ✗ |
| Update | ✓ | ✗ |
| Archive | ✓ | ✗ |

Mechanism identical to Project's: `milestoneService` resolves the parent Project, then `workspaceService.resolveWorkspaceAccess`. No new permission primitive — unlike Task, Milestone has no per-resource ownership concept (no `canMutateTask`-style helper needed), since only owner/admin ever touch it.

## Task↔Milestone integration (the one Task-module change this phase)

`Task.js` gained a nullable `milestone` field (ref `Milestone`). Deliberately scoped:

- **Milestone assignment is update-only.** `taskCreate` does not declare a `milestone` field, and `taskService.createTask` never reads or persists one — even though `taskCreate`'s `.unknown(true)` wouldn't itself reject an extra `milestone` key at the Joi layer, the service-layer omission is the actual enforcement. Workflow is strictly: create Task → (optionally) assign to Milestone via `PUT /api/v1/tasks/:id`.
- **Integrity check on assignment:** `taskService.updateTask` calls the new `assertMilestoneBelongsToProject(milestoneId, projectId)` (via `milestoneService.getMilestoneById`), rejecting a milestone that belongs to a different project than the task. Not extracted as a shared pure helper (unlike `canMutateTask`) — it's a single equality check, extracting it would be over-engineering.
- **No other Task change.** Permission logic (`canMutateTask`, `resolveWorkspaceAccess`) is completely untouched — assigning a task to a milestone is gated by the *existing* task-update authorization, nothing new was added on that axis.
- `taskController.updateTask` needed **no change** — it already forwarded the entire `req.body` to `taskService.updateTask`, so `milestone` passes through automatically once the validator and service accept it. (The original plan assumed a controller change would be needed; turned out unnecessary on inspection.)

## Validation

`milestone.validators.js`: `milestoneCreate` (`projectId` required, `title` 2–150 required, `description` optional max 2000, `dueDate` optional ISO date), `milestoneUpdate` (same fields plus `status` optional enum, all optional). `project`/`createdBy`/`isArchived` stripped server-side on update; `updatedBy` always server-set.

`task.validators.js` addition: `taskUpdate` gained `milestone: Joi.string().allow(null)`. `taskCreate` was **not** changed.

## Tests

`Main/server/test/milestone.test.js` — Joi validator tests for `milestoneCreate`/`milestoneUpdate`, plus two tests confirming `taskUpdate` accepts a `milestone` field (including `null` to unassign) and one documenting that `taskCreate`'s schema carries no explicit `milestone` rule (enforcement is service-layer, not schema-layer — the test says so rather than implying Joi rejects it). Existing `test/task.test.js` (29 pre-existing assertions across all modules) re-run after the Task edits and confirmed unaffected. `assertMilestoneBelongsToProject` and all other DB-touching service logic remain untested by automation — sixth consecutive module with this gap.

## Architectural concerns discovered

- **First cross-module schema change this sprint** (Task's model/validator/service touched). Kept to exactly the four things approved: nullable field, update-only validator entry, service integrity check, no controller change (turned out unneeded). Re-ran the full existing test suite to confirm no regression — passed unchanged.
- **No archive cascade.** Archiving a Milestone does not clear `Task.milestone` on tasks that point to it — they keep referencing an archived milestone. Same non-cascade philosophy already established for Workspace→Project; not fixed here, documented as a deliberate non-decision.
- **Sixth-deep unverified-permission chain** (Team→Workspace→Project→Task/Milestone all lean on `resolveWorkspaceAccess`, still zero DB-backed integration tests anywhere in the repo). Restating the standing recommendation once more.
- **`assertMilestoneBelongsToProject` runs an extra `Milestone` fetch on every task update that touches `milestone`** — one more query added to an already multi-hop permission chain (Task→Project→Workspace/Team). Consistent with the no-caching pattern already flagged repeatedly; not addressed here.
