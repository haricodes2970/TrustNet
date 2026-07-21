# Module: Documents

Files: `src/routes/document.routes.js`, `src/controllers/documentController.js`, `src/services/documentService.js`, `src/services/storageService.js`, `src/validators/document.validators.js`, `src/models/Document.js`. Built on top of [projects.md](projects.md). See [DATABASE.md](../../DATABASE.md#document-documentjs).

## Scope

Document upload, metadata, and access control only. **Not implemented, per explicit scope:** versioning, previews, OCR, comments, folders, collaborative editing, sharing, or any storage provider beyond the local-disk default.

## Routes (`/api/v1/documents`) — all auth required

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | any resolvable workspace role | upload — multipart, metadata + file in one request (`upload.single("document")`, same one-shot pattern as `profile.routes.js`/`verification.routes.js`) |
| GET | `/` | any resolvable role | list accessible documents; optional `?projectId=` |
| GET | `/:id` | any resolvable role | get one — response includes a **freshly-generated** `url`, computed on demand, never read from a stored field |
| PUT | `/:id` | owner/admin, or the uploader | update metadata (`title`/`description` only — the file itself is immutable after upload) |
| DELETE | `/:id` | owner/admin, or the uploader | archive (soft delete) |

No separate upload-then-attach endpoint — rejected during planning as unnecessary complexity this codebase doesn't use anywhere else.

## Controller (`documentController.js`)

`createDocument`, `getDocument`, `listDocuments`, `updateDocument`, `archiveDocument` — thin. `getDocument` is the one controller with more than a single service call: fetch → `assertDocumentViewAccess` → `getDownloadUrl` → merge into response. Still no business logic in the controller — each step is a single service call, no branching.

## Service (`documentService.js`)

`createDocument`, `getDocumentById`, `assertDocumentViewAccess`, `getDownloadUrl`, `listDocumentsForUser`, `updateDocument`, `archiveDocument`, and `canMutateDocument` (exported for testing). Imports `projectService.getProjectById`/`listProjectsForUser`, `workspaceService.resolveWorkspaceAccess`, and `storageService`. Does not import `teamService`/`startupService`/`taskService`/`milestoneService`, does not query `Team`/`Startup`/`Workspace`/`Task`/`Milestone` models directly.

## Model

`Document`: `project` (ref `Project`, required, indexed — only relationship), `title`, `description`, `fileName` (original filename, display only), `mimeType`, `fileSize`, `storageProvider` (enum, currently `["local"]` only — **widen this enum when a second provider is added**, the one place a new provider forces a schema change), `storageKey` (opaque, provider-specific), `checksum` (sha256 hex digest), `createdBy` (ref `User`, required — **uploader, audit only, never used for authorization**), `updatedBy` (audit only), `isArchived`.

**No `url` field.** Explicit design decision: delivery URLs are never persisted. `storageService.downloadUrl()` generates one on demand every time a document is read — decouples the database from URL lifetime/expiry and keeps provider-swapping from touching stored data.

## Permissions model

**No new authority.** `documentService` resolves access exclusively through `workspaceService.resolveWorkspaceAccess()`, reached via the parent Project (`projectService.getProjectById`) — identical foundation-reuse chain to Task/Milestone.

**`canMutateDocument(document, userId, workspaceRole)` is a dedicated, separate helper — explicitly NOT a reuse of `canMutateTask`.** Documents have no `assignedTo` concept, only `createdBy` (the uploader); the two functions happen to look similar but were built independently by design, not shared, and live in `documentService.js` rather than `serviceUtils.js` (unlike `canMutateTask`, which was built anticipating reuse — `canMutateDocument` was explicitly scoped as Document-specific).

| Action | Owner/Admin | Contributor |
|---|---|---|
| Upload | ✓ | ✓ |
| View | ✓ | ✓ |
| Update metadata | ✓ (any document) | ✓ only if they uploaded it (`createdBy` match) |
| Archive | ✓ (any document) | ✓ only if they uploaded it |

Contributors follow Task's tier (write-capable), not Milestone's (owner/admin-only) — a document is a work artifact, not a structural checkpoint.

**Guard:** upload fails if the parent **Project** itself is archived (`project.isArchived`) — Document's immediate parent is Project, so it checks Project's own flag, not the Workspace's. This mirrors the exact per-layer pattern already established: Task checks `project.isArchived`, Project checks `workspace.isArchived`, each module guards its immediate parent only, never reaches further up the chain.

## Storage abstraction (`storageService.js`)

Three functions: `upload({buffer, mimeType, originalFileName}) -> {storageProvider, storageKey, checksum, fileSize}`, `downloadUrl(storageProvider, storageKey) -> string`, `remove(storageProvider, storageKey) -> void`.

**Local-disk provider only.** No external storage provider was specified for this phase — implemented a local filesystem provider (`Main/server/storage/documents/`, gitignored) as the most appropriate equivalent available without inventing cloud credentials this repo doesn't have (same reasoning applied to choosing `node --test` over introducing Jest, and `mongodb-memory-server` for DB testing, in the two prior infrastructure phases). Every function takes `storageProvider` as a discriminator so adding a second provider is a branch inside these three functions, not a signature change.

`downloadUrl()`'s local-provider return value (`/local-storage/documents/<storageKey>`) is **not wired to an actual HTTP file-serving route** — no such route was requested this phase. `remove()` is exposed per the required interface but **not called by any endpoint** — archiving is a soft delete (consistent with every other collaboration module), so nothing in this phase hard-deletes a file. Available for a future cleanup/hard-delete flow.

## Validation

`document.validators.js`: `documentCreate` (`projectId` required, `title` 2–200 required, `description` optional max 2000), `documentUpdate` (same fields, all optional). **File/upload validation is not Joi** — `multer`'s `fileFilter` (mimetype allowlist) and `limits.fileSize` (20MB cap) in `document.routes.js` handle that, same division of labor already used by `profile.routes.js`/`verification.routes.js`. Both the allowlist and the size cap are **placeholder decisions** — no product spec was given; revisit before production.

## Tests

**Unit** (`test/document.test.js`, 11 tests): `documentCreate`/`documentUpdate` Joi validators, plus `canMutateDocument` (owner/admin always; contributor only own-uploaded; no role denies; and one test confirming an `assignedTo`-shaped field is deliberately ignored, unlike `canMutateTask`).

**Integration** (`test/integration/documentAuthorization.test.js`, 20 tests, reusing `createCollaborationFixture()` — no new fixture needed): storage abstraction correctness (no persisted URL, file actually written to disk, on-demand `getDownloadUrl`), owner/admin manage-any, contributor upload/view/update-own/archive-own, contributor blocked from touching others' documents, unrelated-user denial on all four operations, archived-project upload guard, and the now-standard list-filter-authorization regression test (`?projectId=` can't bypass access — same recurring bug class already found and fixed twice in Project and Task).

One test-authoring mistake caught during this phase (not a production bug): an early draft of the archived-project-guard test archived the **Workspace** instead of the **Project**, based on a wrong assumption that Document's guard checked the same layer Project's guard does. `documentService.createDocument` was correct as written (checks its immediate parent, Project, matching Task's precedent) — the test was wrong, not the code. Fixed the test.

## Architectural concerns discovered

- **`resolveDocumentAccess` is a fourth near-identical implementation of "fetch parent, resolve workspace access"** (alongside `taskService.resolveTaskAccess`, `milestoneService.assertMilestoneWriteAccess`, `milestoneService.assertMilestoneViewAccess` — already flagged in the Collaboration Architecture Audit as a P2 refactor candidate). Not fixed here per "do not refactor services" scope for this phase — restating the standing recommendation, now with a fourth data point.
- **`canMutateDocument` and `canMutateTask` are structurally near-identical** (owner/admin always true, contributor checks one ownership field) despite being deliberately separate per your explicit instruction. This is a real, acknowledged duplication-by-design tradeoff, not an oversight — documented here so it reads as intentional the next time someone reviews this code, not as something that was missed.
- **The local storage provider is real, not a mock** — files are actually written to and read from disk during tests, cleaned up in an `after` hook. This makes the integration tests meaningfully prove the storage abstraction's contract, at the cost of the test suite touching the filesystem (previously it only touched an in-memory MongoDB) — a new category of test-environment dependency worth knowing about.
- **Mimetype allowlist and file-size cap are unreviewed guesses** — flagged in Validation above, restated here as a pre-production risk, not just a cosmetic TODO.
