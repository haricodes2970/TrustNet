# Module: Hiring

Files: `src/routes/job.routes.js`, `src/controllers/jobController.js`, `src/services/jobService.js`, `src/validators/job.validators.js`, `src/models/Job.js`. Built directly on [startups.md](startups.md) — **no** Workspace, Project, or Documents dependency, by explicit design.

**Now built upon by [applications.md](applications.md).** `Job` exports `getJobById`/`resolveStartupAccess`, both consumed read-only by `applicationService.js` — no change to `jobService.js` was required to support Applications. Unlike Job's own contributor tier (read-only for draft/published), Applications gives contributors **zero** access — a stricter, independently-decided policy for the more sensitive resource one layer down.

## Architecture

```
Startup
   ↓
Job
```

**Deliberate, known duplication — flagging prominently, not a discovery:** every other collaboration module (Team through Documents) resolves permission via `workspaceService.resolveWorkspaceAccess()`, which requires a Workspace to exist. Hiring must not depend on Workspace/Project (explicit instruction), so `jobService.js` implements its **own, separate, intentionally duplicated** `resolveStartupAccess(startupId, userId)` and `getAccessibleStartupIds(userId)` — same founder=owner / active-Team-admin=admin / active-Team-member=contributor role computation `workspaceService` already has, reimplemented independently rather than extracted into a shared primitive. This was an explicit decision: the collaboration permission layer (`resolveWorkspaceAccess`, `canMutateTask`, `canMutateDocument`) is already integration-tested and stays untouched until a dedicated refactoring phase collapses this duplication on purpose, not as a side effect of building Hiring. See `BACKLOG.md` for the standing note.

`jobService.js` imports `Startup`/`Team` models directly — **not** `workspaceService`, `projectService`, `teamService`, or `documentService`. Zero coupling to any prior collaboration module.

## Routes (`/api/v1/jobs`)

Unlike every other route file in this codebase, this one does **not** apply `router.use(authenticate)` globally — `GET /` and `GET /:id` are public.

| Method | Path | Auth | Access | Purpose |
|---|---|---|---|---|
| POST | `/` | required | owner/admin | create (`startupId` in body, defaults to `status: draft`) |
| GET | `/` | none | public sees published-only, everywhere; authenticated users see published-everywhere **plus** all statuses for startups they have a role on | list, `?startupId=` |
| GET | `/:id` | none | public/unrelated sees only if `published` and not archived; else owner/admin/contributor | get one — **404 on any denial**, not 403 |
| PUT | `/:id` | required | owner/admin | update metadata (not `status`) |
| DELETE | `/:id` | required | owner/admin | archive (soft delete, `status` untouched) |
| PUT | `/:id/publish` | required | owner/admin | `draft → published`, strict validation (see below) |
| PUT | `/:id/unpublish` | required | owner/admin | `published → draft` |

## Controller (`jobController.js`)

Thin, matching every other module — except `getJob`, which **always** returns 404 on any rejection from `assertJobViewAccess`, never 403. This is a deliberate, first-of-its-kind exception to the 403-on-no-access convention every other module in this repo follows: concealing a draft job's *existence*, not just its content, from anyone without a role on its Startup.

## Model

`Job`: `startup` (ref `Startup`, required, indexed — only relationship), `title` (required — even drafts need a label), `department`, `employmentType` enum, `location`, `remotePolicy` enum, `salaryMin`/`salaryMax`, `currency` enum (reuses `Startup`'s own currency list), `description`, `requirements` (String[]), `status` enum (`draft`/`published`/`closed`, default `draft`), `createdBy`/`updatedBy` (audit only, never used for authorization), `isArchived`.

**Content fields are NOT `required` at the schema level** (`employmentType`, `remotePolicy`, `description`) — drafts may be incomplete. Required-for-publish is enforced as a business rule (`assertPublishReady`), not a schema constraint. `title` is the one required content field even for a draft, since a job needs some identifying label to manage in a list.

## Permissions model

| Action | Public | Owner/Admin | Contributor |
|---|---|---|---|
| View `published`, non-archived job | ✓ | ✓ | ✓ |
| View `draft`/`closed`/archived job | ✗ (404) | ✓ | ✓ (read-only) |
| Create | ✗ | ✓ | ✗ |
| Update | ✗ | ✓ | ✗ |
| Archive | ✗ | ✓ | ✗ |
| Publish/Unpublish | ✗ | ✓ | ✗ |

No new authority beyond `resolveStartupAccess` — no per-job ownership tier like `canMutateTask`/`canMutateDocument`, since contributors have zero write access here regardless of who created the job. Structural, like Project/Milestone, not contributor-writable like Task/Documents.

**Archiving does not change `status`.** A job archived while `status: published` remains `status: published` in the database — but `assertJobViewAccess` requires **both** `status === "published"` **and** `!isArchived` for public visibility, so an archived-but-still-"published" job correctly disappears from public view without needing a status mutation on archive. Tested explicitly (`public CANNOT view an archived-but-still-'published'-status job`).

## List authorization — "downgrade, not deny"

Every prior module's list-filter regression fix was "reject an unauthorized explicit filter." Hiring's is different, deliberately: an explicit `?startupId=` filter for a startup the caller has no role on **silently downgrades to the public subset** (published, non-archived only) rather than throwing. This is not a bypass — the caller never sees anything an anonymous visitor couldn't already see for that startup — but it's a genuinely different shape of "safe" than Project/Task/Document's outright rejection, worth understanding clearly before extending this pattern elsewhere.

With no filter: anonymous sees published jobs **across all startups** (the first true public, cross-startup listing in this codebase — every other module's "no filter" listing is scoped to the caller's own accessible resources, never global). An authenticated user with no filter sees published-everywhere **plus** every status for startups they have a role on (`$or` query in `listJobsForUser`).

## Validation

`job.validators.js`: `jobCreate` (`startupId`, `title` required; everything else optional — deliberately loose to allow incomplete drafts), `jobUpdate` (same fields, all optional, **no `status`** — status changes only via publish/unpublish).

**Business rules (service-layer, not Joi):**
- `validateSalaryRange(salaryMin, salaryMax)` — pure function, throws if both present and `salaryMin > salaryMax`. Enforced on both create and update (on update, merges the incoming partial value against the existing stored value before checking — so updating only `salaryMin` still validates against the existing `salaryMax`).
- `assertPublishReady(job)` — pure function, throws if `isArchived`, or if `title`/`description`/`employmentType`/`remotePolicy` is missing.

Both are exported from `jobService.js` and unit-tested directly (pure, no DB).

## Tests

**Unit** (`test/job.test.js`, 11 tests): Joi validators, `validateSalaryRange`, `assertPublishReady`.

**Integration** (`test/integration/jobAuthorization.test.js`, 27 tests): owner/admin full lifecycle, contributor read-only enforcement, unrelated/public denial, publish business rules (incomplete draft, archived job), salary-range validation at create and update, the full visibility matrix (public/contributor/unrelated × draft/published/archived), **both directions of Workspace/Project independence** (one test with no Workspace/Project ever created for the startup, one test confirming it still works fine when they do exist), and the "downgrade not deny" list-filter regression including the cross-startup anonymous listing and the authenticated-user merge behavior.

New test fixture: `createStartupTeamFixture()` added to `collaborationFixtures.js` (Startup+Team only, no Workspace/Project) — proves independence by construction, not just by assertion. `createCollaborationFixture()`'s behavior/shape is unchanged; verified by re-running the full existing integration suite (64/64 unaffected) before adding Job's own tests.

## Architectural concerns discovered

- **The central, accepted tradeoff of this module:** `resolveStartupAccess`/`getAccessibleStartupIds` duplicate logic that already exists in `workspaceService.js`. This was an explicit instruction, not an oversight — recorded here and in `BACKLOG.md` so it reads as a deliberate decision, not a missed refactor, the next time someone reads this code.
- **First genuinely public read surface in this codebase.** A permission bug here is visible to the entire internet, not just a wrong internal user — categorically higher stakes than any prior module's permission bug. `getJob`'s always-404 behavior and the list endpoint's "downgrade not deny" logic are the two places this risk concentrates; both have direct test coverage, but this is still new territory worth extra scrutiny.
- **Mimetype/salary/currency choices are reused from `Startup`'s existing enums** where possible (currency) to avoid inventing a second inconsistent list — deliberate consistency, not an oversight.
- **No cascade from Startup to Job** — nothing currently prevents a Job from outliving meaningful reference to its Startup in edge cases (e.g. no Startup-deletion cascade exists anywhere in this codebase, and Startup is the one module with hard delete, not soft-archive, unlike everything else — see the Collaboration Architecture Audit). Not addressed here, consistent with the "no cascade" precedent everywhere else.
