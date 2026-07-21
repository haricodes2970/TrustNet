# Module: Applications

Files: `src/routes/application.routes.js`, `src/controllers/applicationController.js`, `src/services/applicationService.js`, `src/validators/application.validators.js`, `src/models/Application.js`. Built directly on [hiring.md](hiring.md) — **not** attached to Startup directly, **not** using the Document model/`documentService`.

## Architecture

```
Startup
   ↓
Job
   ↓
Application
```

`applicationService.js` imports `jobService.getJobById`/`resolveStartupAccess` (reuse — Applications sits directly under Hiring, same "reuse your immediate parent's service" pattern Task/Milestone/Documents used) and `storageService` directly. Does **not** import `documentService`, does not touch the `Document` model, does not import `workspaceService`/`teamService`/`startupService` directly.

## Three permission shapes meet here — more than any prior module

1. **Candidate ownership** — `application.applicant === userId`, a flat comparison, reused via `serviceUtils.assertOwner`. No role resolution at all.
2. **Startup owner/admin** — via `jobService.resolveStartupAccess(job.startup, userId)`, reused unchanged.
3. **Contributor and everyone else: explicitly no access.** `resolveApplicationRole()` (`applicationService.js`) deliberately excludes `"contributor"` even though `jobService.resolveStartupAccess` would happily report it — Applications intentionally grants Startup staff access only at the owner/admin tier, never contributor, per your explicit spec. This is the module's own decision layered on top of a reused primitive, not something `resolveStartupAccess` does for free.

## Permissions model

| Action | Candidate (applicant) | Startup Owner/Admin | Contributor | Public |
|---|---|---|---|---|
| Submit | ✓ (any authenticated user, no role needed) | — | — | ✗ (auth required) |
| View own/managed application | ✓ own only | ✓ any for jobs they manage | ✗ | ✗ |
| Update resume | ✓ own, only while `status: submitted` | ✗ | ✗ | ✗ |
| Update cover letter | ✓ own, only while `status: submitted` | ✗ | ✗ | ✗ |
| Update status / add notes | ✗ | ✓ | ✗ | ✗ |
| Withdraw | ✓ own, from any non-terminal state | ✗ | ✗ | ✗ |

**No public tier at all** — every route requires `authenticate` (`router.use(authenticate)` at the top of `application.routes.js`), unlike `job.routes.js`. First Hiring-domain module with zero unauthenticated surface.

**Field-level redaction:** `notes` (internal, staff-only) is stripped from every response the candidate receives — even on their own application — via the pure `redactForCandidate()` helper. First module in this codebase where the same resource is shaped differently depending on who's asking; every prior module returned an identical object regardless of viewer tier.

## List authorization — "scope, don't reject"

`listApplicationsForUser` never has an explicit "throw 403" branch — every result is scoped so the caller structurally cannot see anything beyond what's rightfully theirs:

- Explicit `?jobId=` filter, caller is owner/admin on that job's Startup → sees every application for that job.
- Explicit `?jobId=` filter, caller is anyone else (candidate, contributor, unrelated) → silently scoped to `applicant: userId` — returns only their own application(s) for that job (typically 0 or 1), never anyone else's.
- No filter → always scoped to `applicant: userId` — "list all applications across every job I manage" was not requested and is not built (would need a separate aggregate query across all the caller's Startups); staff must supply `?jobId=` explicitly to review a specific job's applicants.

This achieves the same non-leakage guarantee as every prior module's list-filter regression fix, but via query construction rather than an authorization exception — there is no code path where an unauthorized viewer's query even asks for someone else's data.

## Application lifecycle

```
submitted → under_review → interview → offer → hired   (terminal)
   ↓             ↓             ↓          ↓
   └─────────────┴─────────────┴──────────┴──→ rejected  (terminal, staff-only, from any non-terminal state)
   (any non-terminal state) → withdrawn            (terminal, candidate-only)
```

`assertValidStatusTransition(currentStatus, nextStatus)` (pure, `applicationService.js`, unit-tested): terminal states (`hired`/`rejected`/`withdrawn`) permit no further transition by anyone; `rejected` is reachable from any non-terminal state; every other transition must be exactly one step along the forward path — no skipping ahead (`submitted` straight to `offer` is rejected). `withdrawn` is reachable only via the dedicated withdraw endpoint, never via `PUT /:id/status` — the status validator's enum excludes both `submitted` and `withdrawn` as staff-settable values.

## Model

`Application`: `job` (ref `Job`, required, indexed — only relationship), `applicant` (ref `User`, required, indexed — the candidate, not assumed to be a Team member), `resumeStorageProvider`/`resumeStorageKey`/`resumeChecksum`/`resumeFileName` (mirrors `Job`/`Document`'s storage-metadata shape, but flat on `Application`, **no persisted URL** — generated on demand via `storageService.downloadUrl()`, same principle as Documents, extended here by consistency rather than restated instruction), `coverLetter` (plain text, optional), `status` enum, `notes` (**single string, not an array** — internal, staff-only, explicitly not designed to grow into a note-history feature; a dedicated module is expected to own that later), `createdBy`/`updatedBy` (audit only).

**Partial unique index:** `{ job: 1, applicant: 1 }`, `partialFilterExpression: { status: { $ne: "withdrawn" } }` — blocks a concurrent duplicate *active* application at the DB layer (race-safe, same reasoning as `Workspace.startup`'s unique index), while still permitting re-application after a withdrawal. `applicationService.createApplication` also runs an app-level `findOne` pre-check for a friendlier error message, and catches Mongo's `code === 11000` as the race-condition backstop — same "check first, DB constraint as the real guarantee" pattern `workspaceService.createWorkspace` already uses.

## API (`/api/v1/applications`)

| Method | Path | Access |
|---|---|---|
| POST | `/` | any authenticated user |
| GET | `/` | scoped per caller, see above |
| GET | `/:id` | applicant (notes redacted) or job's Startup owner/admin |
| PUT | `/:id/resume` | applicant only, `status: submitted` only |
| PUT | `/:id/cover-letter` | applicant only, `status: submitted` only |
| PUT | `/:id/status` | owner/admin only |
| PUT | `/:id/withdraw` | applicant only |

**No generic `PUT /:id`** — per your instruction, dedicated endpoints (`/resume`, `/cover-letter`) replace a single catch-all update, making the candidate's editable surface explicit rather than inferred from a merged payload.

## Validation

`application.validators.js`: `applicationCreate` (`jobId` required, `coverLetter` optional — resume handled by `multer`, not Joi, same split as every prior upload route), `coverLetterUpdate` (`coverLetter` required, can be empty string), `statusUpdate` (`status` optional from the staff-settable subset, `notes` optional, `.or("status", "notes")` — at least one must be present).

**Business rules (service layer):** job must be `published` and not archived to accept a new application (covers unpublished, closed-via-unpublish, and archived — all three cases from your spec produce the identical rejection path, since `Job.status` reverting to `draft` via unpublish and never having been published both fail the same `status !== "published"` check); duplicate-active-application prevention (app-level + DB partial unique index); status transitions gated by `assertValidStatusTransition`; candidate edits gated by `status === "submitted"`.

## Storage

Reuses `storageService.upload()`/`downloadUrl()` directly — the real local-disk provider from the Documents phase, not a mock, not the `Document` model. `multer` config in `application.routes.js` mirrors `document.routes.js`'s pattern (memoryStorage, `fileFilter`, `limits`) with a smaller cap (5MB placeholder, no product spec given, same caveat as every prior file-upload route) and a resume-appropriate mimetype allowlist (PDF, `.doc`, `.docx`).

## Tests

**Unit** (`test/application.test.js`, 12 tests): Joi validators, `assertValidStatusTransition` (happy path, skip-ahead rejection, reject-from-any-non-terminal, terminal-state immutability), `redactForCandidate`.

**Integration** (`test/integration/applicationAuthorization.test.js`, 28 tests): full candidate lifecycle (submit/view/edit-while-submitted/edit-locked-after-review/withdraw/re-apply-after-withdrawal), owner/admin review flow (view-with-notes, valid transitions, skip-ahead rejection, reject-from-any-state, terminal immutability, cannot touch resume/cover letter), contributor and unrelated-user denial on every action, job-state gates (draft/archived/unpublished-after-being-published), duplicate-prevention (both the friendly app-level rejection and the DB partial-unique-index path via re-application-after-withdrawal), real on-disk storage verification, and the "scope don't reject" list-authorization regression (including the owner/admin full-roster case and the contributor-sees-nothing-of-their-own case).

**One test-infra issue found and fixed during this phase, not a production bug:** `documentAuthorization.test.js` and this module's integration test both clean up the same shared local-storage directory (`storage/documents/`) in their `after` hooks. `node --test` runs test files concurrently, so the two cleanup calls raced (`ENOTEMPTY` on Windows) when running the full combined suite (`npm run test:all`), even though each file passed independently. Fixed by adding `maxRetries`/`retryDelay` to both files' `fs.rm` calls (Node's built-in option for exactly this kind of concurrent-delete race) — verified stable across 3 repeated full-suite runs (190/190 each time) after the fix.

## Architectural concerns discovered

- **Third distinct authority shape in the codebase now exists** (Team-role-based, Hiring's duplicated Startup-role-based, and this module's flat candidate-ownership-based) — worth keeping in mind if a future module needs yet another shape; not every future module should default to reusing `resolveStartupAccess`/`resolveWorkspaceAccess` if its actual authority relationship is genuinely different, the way Applications' candidate side is.
- **`notes` field redaction is the first per-viewer response-shaping requirement** in this codebase — every prior module returned an identical object to every authorized viewer. Future modules with similarly sensitive fields should follow this same "pure redaction helper, applied at the service boundary" pattern rather than inventing a new approach.
- **Two independently-shaped "file record" conventions now exist** (Document's `title`/`description`/`fileName`+Project scope vs Application's flat storage triple+`resumeFileName`+Job scope) — a deliberate consequence of your instruction not to reuse Document/documentService here, not an inconsistency introduced by accident.
- **Candidate PII/compliance exposure is new territory** — resumes and cover letters are real personal data about real people, potentially regulated depending on jurisdiction (retention limits, right-to-deletion). Flagged, not addressed — a legal/business question, not an engineering one.
- **Shared local-storage-directory test cleanup race** (see Tests, above) — fixed for Documents+Applications specifically; if a third module ever reuses `storageService`'s local provider in its own integration tests, its cleanup hook will need the same `maxRetries`/`retryDelay` treatment.
