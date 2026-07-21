# Database

MongoDB via Mongoose (`Main/server/src/config/database.js`, `Main/server/src/models/`). This file is the schema-level reference; for narrative collection relationships and hashing rules see the existing [docs/DATABASE.md](docs/DATABASE.md) — that doc predates this reorg and is kept as-is, cross-check both when in doubt.

## Connection

`connectDB()` calls `mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })`. Required env: `MONGO_URI` (see [ARCHITECTURE.md](ARCHITECTURE.md#request-lifecycle), [README.md](README.md)). Optional: `MONGODB_DNS_SERVERS` (comma-separated DNS override, parsed to array in `env.js`).

## Models

### User (`User.js`)

| Field | Type | Notes |
|---|---|---|
| fullName | String | required, 2–100 chars |
| username | String | required, unique, lowercase, `/^[a-z0-9_]+$/`, indexed |
| password | String | `select: false`, hashed |
| resetPasswordToken / resetPasswordExpires | String / Date | `select: false` |
| twoFactorEnabled | Boolean | default false |
| twoFactorSecret / twoFactorPendingSecret | String | `select: false`, encrypted |
| googleId / linkedinId | String | unique, sparse, indexed |
| email | String | required, unique, lowercase, indexed |
| avatarUrl, bio, location, designation, websiteUrl, linkedin | String | profile fields |
| role | String enum | founder, entrepreneur, investor, client, mentor, builder, admin — default builder |
| onboardingCompleted | Boolean | default false |
| interests, skills | String[] | max 50 chars/entry |
| isVerified | Boolean | default false |
| verificationStatus | String enum | not_submitted, draft, pending, approved, rejected |
| verificationDocuments | Array | type, name, url, publicId, status, rejectionReason, uploadedAt |
| isActive | Boolean | default true |
| profileVisibility | String enum | public, private, connections |
| followersCount / followingCount | Number | default 0 |

Indexes: `username` (unique), `email` (unique), `googleId` (unique, sparse), `linkedinId` (unique, sparse).

### Startup (`Startup.js`)

`founder` (ref User, indexed), `name`, `slug` (unique), `tagline`, `description` (50–5000 chars), `category`, `stage` enum (idea/validation/early-stage/growth/established), `location`, `websiteUrl`, `pitchDeckUrl`, `logoUrl`, `problemStatement`, `solution`, `targetMarket`, `fundingGoal`, `fundingRaised`, `currency` enum, `status` enum (draft/active/hidden/closed), `tags[]`, `isFeatured`, `isPublic`.

Indexes: text index on `{ name, tagline, description }`; `founder` indexed.

### Job (`Job.js`)

`startup` (ref Startup, required, indexed — only relationship, **no** Workspace/Project dependency), `title` (required), `department`, `employmentType` enum, `location`, `remotePolicy` enum, `salaryMin`/`salaryMax`, `currency` enum (reuses `Startup`'s own list), `description`, `requirements[]`, `status` enum (draft/published/closed, default draft — indexed), `createdBy`/`updatedBy` (audit only, never used for authorization), `isArchived` (indexed).

Content fields (`employmentType`, `remotePolicy`, `description`) are **not** schema-required — drafts may be incomplete; publish-time strictness is a business rule (`jobService.assertPublishReady`), not a schema constraint. Permissions resolved via `jobService`'s own `resolveStartupAccess()` — a **deliberate, known duplication** of the role-computation logic already in `workspaceService.resolveWorkspaceAccess()`, not shared with it by explicit instruction (collaboration permission layer left untouched pending a dedicated future refactor). See [docs/modules/hiring.md](docs/modules/hiring.md).

### Application (`Application.js`)

`job` (ref Job, required, indexed — only relationship), `applicant` (ref User, required, indexed — candidate, not assumed to be a Team member), `resumeStorageProvider`/`resumeStorageKey`/`resumeChecksum`/`resumeFileName` (flat storage-metadata fields, **no persisted URL** — generated on demand via `storageService.downloadUrl()`), `coverLetter` (plain text, optional), `status` enum (submitted/under_review/interview/offer/hired/rejected/withdrawn, default submitted, indexed), `notes` (**single string, not an array** — internal, staff-only, never used for authorization), `createdBy`/`updatedBy` (audit only).

Reuses `storageService` directly — **not** the `Document` model/`documentService`, by explicit instruction. Partial unique index: `{ job: 1, applicant: 1 }`, `partialFilterExpression: { status: { $ne: "withdrawn" } }` — blocks a concurrent duplicate active application, permits re-application after withdrawal. Permissions: candidate ownership (`application.applicant === userId`, flat comparison via `assertOwner`) plus `jobService.resolveStartupAccess()` for Startup owner/admin — contributor explicitly excluded, unlike every other tier that reuses `resolveStartupAccess`/`resolveWorkspaceAccess`. See [docs/modules/applications.md](docs/modules/applications.md).

### Community (`Community.js`)

`name`, `slug` (unique), `description`, `category` enum, `type` enum (public/private/restricted), `owner` (ref User, indexed), `members` (ref User[]), `rules[]`, `tags[]`, `coverImageUrl`, `isActive`, `memberCount`.

### Post (`Post.js`)

`author` (ref User, indexed), `community` (ref Community, nullable, indexed), `startup` (ref Startup, nullable, indexed), `title`, `content` (1–12000 chars), `postType` enum (discussion/announcement/update/pitch/question), `images[]`, `videoUrl`, `tags[]`, `visibility` enum (public/community/private), `isPinned`, `commentCount`, `likeCount`, `likes` (ref User[]).

Indexes: text index on `{ title, content, tags }`.

### Comment (`Comment.js`)

`post` (ref Post, indexed), `author` (ref User, indexed), `content` (1–2000 chars).

### Conversation (`Conversation.js`)

`participants` (ref User[], indexed), `type` enum (direct/group), `title`, `createdBy` (ref User), `lastMessage` ({content, sender, sentAt}), `lastActivityAt` (indexed), `isArchived`.

Indexes: `{ participants: 1, lastActivityAt: -1 }`.

### Message (`Message.js`)

`conversation` (ref Conversation, indexed), `sender` (ref User, indexed), `content` (max 5000), `attachments[]`, `readBy` (ref User[]), `status` enum (sent/delivered/read), `isEdited`, `editedAt`, `replyTo` (ref Message).

Indexes: `{ conversation: 1, createdAt: 1 }`.

### Notification (`Notification.js`)

`recipient` (ref User, indexed), `type` (String, indexed), `title`, `message`, `data` (Mixed), `read` (Boolean, indexed).

Indexes: `{ recipient: 1, read: 1, createdAt: -1 }`.

### CollaborationRequest (`CollaborationRequest.js`)

`sender` / `recipient` (ref User, indexed), `startup` (ref Startup, nullable, indexed), `type` enum (mentorship/funding/partnership/advisor/other), `subject`, `message` (10–5000 chars), `status` enum (pending/accepted/rejected/withdrawn), `responseMessage`, `isArchived`.

### UserPreference (`UserPreference.js`)

`user` (ref User, unique, indexed), `notifications`, `emailNotifications`, `marketingEmails` (Boolean), `theme` enum (system/light/dark), `language`, `timezone`, `privacy`/`profileVisibility` enum, `allowMessages`, `allowCollaborationRequests`.

### Workspace (`Workspace.js`)

`startup` (ref Startup, required, **unique** — enforces exactly one workspace per startup at the DB layer), `name`, `description`, `owner` (ref User, required, indexed, denormalized from `Startup.founder` at creation), `settings.defaultVisibility` enum (private/team, default team), `isArchived` (default false).

No stored membership list — access is resolved live against `Team.members` (queried by `startup`), not duplicated onto `Workspace`. See [docs/modules/workspace.md](docs/modules/workspace.md).

### Project (`Project.js`)

`workspace` (ref Workspace, required, indexed), `name`, `description`, `status` enum (planning/active/on_hold/completed/archived, default planning — **business lifecycle field only, never used for authorization**), `owner` (ref User, required — **creator, audit only, never used for authorization**), `updatedBy` (ref User, set on every update/archive — audit only), `isArchived` (default false).

All permission decisions for Projects come exclusively from `workspaceService.resolveWorkspaceAccess()` against the parent `Workspace` — see [docs/modules/projects.md](docs/modules/projects.md).

### Task (`Task.js`)

`project` (ref Project, required, indexed — no denormalized workspace ref), `title`, `description`, `status` enum (todo/in_progress/in_review/done/archived, default todo — business lifecycle only, never used for authorization), `priority` enum (low/medium/high/urgent, default medium), `assignedTo` (ref User, optional — validated as an active workspace member at write time), `dueDate`, `createdBy` (ref User, required — creator, audit only, never used for authorization), `updatedBy` (ref User, audit only), `isArchived` (default false), **`milestone`** (ref Milestone, nullable, added Phase 4 — **update-only**, never settable at create time; see [docs/modules/milestones.md](docs/modules/milestones.md)).

Parent Workspace resolved through `Project.workspace` on every access check, not stored on Task — deliberate choice to avoid a duplicated relationship (see [docs/modules/tasks.md](docs/modules/tasks.md)). Permissions: `workspaceService.resolveWorkspaceAccess()` (workspace role) composed with `canMutateTask()` (`serviceUtils.js` — contributor may only mutate own-created/own-assigned tasks). `milestone` assignment reuses this same check unchanged; the only new rule is that the milestone must belong to the task's project (`taskService.assertMilestoneBelongsToProject`).

### Milestone (`Milestone.js`)

`project` (ref Project, required, indexed), `title`, `description`, `dueDate`, `status` enum (planned/in_progress/completed/missed/archived, default planned — business lifecycle only, never used for authorization), `createdBy` (ref User, required — audit only), `updatedBy` (ref User, audit only), `isArchived` (default false).

Structural like Project — permissions are owner/admin only (no contributor write), resolved via `workspaceService.resolveWorkspaceAccess()` through the parent Project, same mechanism Project itself uses. No stored task list — `Task.milestone` is the only pointer between the two collections. See [docs/modules/milestones.md](docs/modules/milestones.md).

### Document (`Document.js`)

`project` (ref Project, required, indexed — only relationship), `title`, `description`, `fileName` (original filename, display only), `mimeType`, `fileSize`, `storageProvider` (enum, currently `["local"]` only — widen when a second provider is added), `storageKey` (opaque, provider-specific identifier), `checksum` (sha256 hex digest), `createdBy` (ref User, required — uploader, audit only, never used for authorization), `updatedBy` (audit only), `isArchived` (default false).

**No `url` field** — delivery URLs are never persisted, generated on demand via `storageService.downloadUrl()` on every read. Permissions: `workspaceService.resolveWorkspaceAccess()` through the parent Project, composed with `canMutateDocument()` (`documentService.js` — a dedicated helper, deliberately **not** a reuse of `canMutateTask()`; contributor may only mutate a document they uploaded, no `assignedTo` concept exists for Documents). Upload guard checks `project.isArchived` (its immediate parent), same per-layer pattern Task/Project use. See [docs/modules/documents.md](docs/modules/documents.md).

### Team (`Team.js`)

`startup` (ref Startup, required, indexed), `name`, `description`, `slug`, `owner` (ref User, indexed), `members[]` (sub-doc: `user` ref User nullable, `email`, `name`, `role` enum admin/member, `status` enum pending/active, `invitedBy`, `invitedAt`, `joinedAt`), `memberCount`, `isArchived`.

Indexes: `{ startup: 1 }`, `{ "members.email": 1 }`, `{ "members.user": 1 }`. See [docs/modules/teams.md](docs/modules/teams.md) for the feature this backs.

## Relationships

```
User 1---N Startup (founder)
User 1---N Team (owner)          Startup 1---N Team
Startup 1---1 Workspace (unique) Team.members (queried by startup) --- drives Workspace access, no stored FK
Workspace 1---N Project (Project.owner/status are audit/business fields only — permission derives from Workspace, not Project)
Project 1---N Task (Task has no stored workspace ref; resolved through Project. Task.createdBy/status are audit/business fields only)
Project 1---N Milestone         Milestone 1---N Task (via Task.milestone, nullable, update-only)
Project 1---N Document (Document.createdBy is audit-only; no url stored, generated on demand)
Startup 1---N Job (independent of Workspace/Project — Job resolves permission via its own resolveStartupAccess(), a deliberate duplication of workspaceService's logic)
Job 1---N Application (Application.applicant is the candidate, not a Team member; notes are staff-only, redacted for the candidate view)
User N---N Community (members)   User 1---N Community (owner)
User 1---N Post (author)         Community 1---N Post   Startup 1---N Post
Post 1---N Comment
User N---N Post (likes)
User 1---N CollaborationRequest (sender/recipient)   Startup 1---N CollaborationRequest
User N---N Conversation (participants)   Conversation 1---N Message
User 1---N Notification
User 1---1 UserPreference
```

## Sensitive fields

`password`, `resetPasswordToken`, `resetPasswordExpires`, `twoFactorSecret`, `twoFactorPendingSecret` are all `select: false` — never returned by default queries. See [SECURITY.md](SECURITY.md) for handling rules.

TODO: no migration tooling found in repo — schema changes are applied via Mongoose schema edits directly, no versioned migrations exist. Confirm if this is intentional before scaling the team.
