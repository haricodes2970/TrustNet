# Plan: Startup Teams Feature (Backend Developer 2 — owned domain)

## Feature Summary
Add a **Startup Teams** module that lets a startup founder create teams under a
startup, invite members **by email**, and manage member roles. A team belongs to
exactly one Startup. Members are invited by email; an invited user becomes a
pending member, receives a Notification (existing `notificationService`) and an
email (existing `email.service`), and is activated when they accept (or when an
existing User with that email is found and accepts). This is the foundation for
the later Hiring / Projects / Tasks features.

Decisions locked with user:
- **Scope:** Team is owned by a Startup (`startupId` on the team).
- **Invite flow:** invite **by email**; placeholder pending member; notify + email.
- **Mounting:** top-level `/api/v1/teams` (do **NOT** modify the other dev's
  `startup.routes.js`). Ownership is verified in the team service by loading the
  Startup and checking `founder === req.user.id`.

## Dependencies
- Node, Express 5, Mongoose 9 (existing stack; no new packages).
- Existing modules reused (read-only, NOT modified):
  - `User` model (resolve invited email -> existing user; `id`/`email`).
  - `Startup` model + `startupService` (ownership/authorization check only via
    direct model read; we do not call internal startupService to avoid coupling).
  - `notificationService.createNotification({ recipient, type, title, message, data })`.
  - `email.service` (`sendEmail` or equivalent — verify exact export name before coding).
  - `ApiError` util, `asyncHandler` util, `serviceUtils` (`handleServiceError`,
    `applyQueryOptions`, `normalizeFilter`), `authenticate` + `authorize` middleware,
    `validate` (Joi) middleware.

## Existing Modules Reused
- Authentication: `authenticate` (sets `req.user.id`/`req.user.email`).
- User Management: `User` model (email lookup).
- Startup CRUD: `Startup` model (founder ownership check).
- Notifications: `notificationService.createNotification`.
- (Email infra: `email.service`.)

## Database Changes
New collection **`teams`** (model `Team`). Plain Mongoose schema, `.lean()` reads,
`timestamps: true`, indexed. No changes to existing models/collections.

Proposed `Team` schema:
```
startup:      ObjectId ref Startup, required, index
name:         String, required, trim, min 2, max 100
description:  String, trim, max 2000, optional
slug:         String, optional, lowercase, unique per startup (or just unique)
owner:        ObjectId ref User, required  (the founder who created it)
members: [ {
  user:       ObjectId ref User,  (null while pending/by-email invite)
  email:      String, lowercase, required
  name:       String, optional (for pending display)
  role:       String enum ['admin','member'], default 'member'
  status:     String enum ['pending','active'], default 'pending'
  invitedBy:  ObjectId ref User
  invitedAt:  Date default now
  joinedAt:   Date
} ]
memberCount:  Number default 0, min 0
isArchived:   Boolean default false
```
Indexes: `{ startup: 1 }`, `{ 'members.email': 1 }`, `{ 'members.user': 1 }`.
Member add/remove uses `$addToSet`/`$pull` on `members` + `$inc` on `memberCount`
(mirror `communityService.joinCommunity`/`leaveCommunity` pattern, no negative counts).

## API Design
All routes mounted at `/api/v1/teams`, behind `authenticate`. Responses follow
existing envelope: `{ success: true, data }` / `{ success: false, message }`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/teams` | auth | Create team for a startup (body: `startupId`, `name`, `description?`). Verifies `Startup.founder === req.user.id` (403 otherwise). |
| GET | `/teams` | auth | List teams (query `filter`/`options`); defaults to teams of startups the user owns + teams they belong to. |
| GET | `/teams/:id` | auth | Get one team (must be owner or member, else 403/404). |
| PUT | `/teams/:id` | auth (owner) | Update name/description. Strips `startup`,`owner`,`members`. |
| DELETE | `/teams/:id` | auth (owner) | Soft-archive team (`isArchived=true`) — preserves history. |
| POST | `/teams/:id/members` | auth (owner) | Invite member by email (body: `email`, `name?`, `role?`). Creates pending member, sends Notification + email. Idempotent: if email already a member (pending/active) -> 409/400. |
| PUT | `/teams/:id/members/:memberId/accept` | auth | Accept invite: only the invited user (matched by `req.user.email` === `member.email` or `member.user===req.user.id`) can accept; sets status `active`, sets `user`, `joinedAt`. |
| DELETE | `/teams/:id/members/:memberId` | auth (owner) | Remove a member (owner) OR self-leave (member removing themselves). |
| PUT | `/teams/:id/members/:memberId/role` | auth (owner) | Change a member's role (admin/member). |

Note: `/teams/:id/members/:memberId` uses the member sub-document `_id`
(`member._id`), not the user id.

## Folder Structure (added, does not touch existing modules)
```
src/
  models/Team.js                      (NEW)
  services/teamService.js            (NEW)
  controllers/teamController.js      (NEW)
  routes/team.routes.js              (NEW)
  validators/team.validators.js      (NEW)
  docs/team.swagger.js  (optional)   (NEW, @openapi annotations for Swagger)
```
> Reuse decision: place new files in the existing flat-by-type folders (the
> currently-approved structure) so they integrate with `src/routes/index.js` and
> `src/docs/swagger.js` (`apis: ['./src/routes/*.js']`) with zero restructuring.
> This deliberately does NOT use the un-implemented feature-module layout, because
> the earlier reorg was stopped and this feature must not modify other devs' modules.

## Files to Create
1. `src/models/Team.js` — mongoose schema above; `module.exports = mongoose.model('Team', teamSchema)`.
2. `src/services/teamService.js` — CRUD + membership using `serviceUtils` helpers;
   imports `Team`, `Startup` (ownership check), `User` (email->user resolve),
   `notificationService`, `email.service`; consistent `handleServiceError` pattern.
3. `src/controllers/teamController.js` — thin handlers, `ApiError` status mapping
   (mirror `communityController`/`startupController`).
4. `src/validators/team.validators.js` — Joi: `teamCreate`, `teamUpdate`,
   `memberInvite`, `memberRole`. Follow `startup.validators.js` style (`.unknown(true)`).
5. `src/routes/team.routes.js` — express router; `authenticate` + `validate(...)`;
   `@openapi` blocks on each route (copy `post.routes.js`/`message.routes.js` style).
6. `src/docs/team.swagger.js` (optional) OR inline `@openapi` in the route file.

## Files to Modify (minimal, approved)
- `src/routes/index.js` — add one line:
  `const teamRoutes = require('./team.routes');` and
  `router.use('/teams', teamRoutes);`
  (mount path `/teams` under existing `/api/v1` aggregator — no change to other mounts).
- Do **NOT** modify `startup.routes.js`, `user*`, `community*`, or any other
  developer's files.

## Risks
- **Email service export name:** must verify `email.service.js` actual export
  (`sendPasswordResetEmail` exists; a generic `sendEmail` may not). If only
  `sendPasswordResetEmail` exists, either reuse it (acceptable for invite) or add a
  generic `sendEmail` export to `email.service.js` (that file is infra/shared, not
  another dev's feature module — but confirm with lead first).
- **Duplicate invites:** guard by checking existing `members[].email` before adding.
- **Ownership coupling:** team service reads `Startup` directly (not via
  `startupService`) to avoid cross-module coupling and to keep this module
  self-contained. Acceptable and intentional.
- **Member sub-doc id:** accept/remove endpoints key off `member._id`; ensure it is
  returned in responses and not stripped by `.lean()`.
- **Notification recipient:** when invitee is an existing User, `recipient` = user id;
  when not, we cannot notify in-app (no user yet) — only email is sent. Document this.
- **No tests configured:** `package.json` `test` is a no-op echo; add a smoke test
  only if agreed (out of scope unless requested).

## Testing Strategy
1. `node -e "require('./src/routes')"` loads without `Cannot find module`.
2. `npm run build` (`require('./app')`) prints `Build OK`.
3. Manual (needs Mongo + a user token):
   - Create team for a startup you own -> 201; for a startup you don't own -> 403.
   - Invite by email -> pending member + notification created + email attempted.
   - Accept as invited user -> status `active`, `user` set.
   - Remove/leave, role change, list, get, update, archive.
4. Verify Swagger `/api/docs` still lists the new `@openapi` routes.

## Definition of Done
- All 9 endpoints implemented, mounted at `/api/v1/teams`, behind `authenticate`.
- Reuses `User`, `Startup`, `notificationService`, `email.service`, `ApiError`,
  `serviceUtils`, `authenticate`/`authorize`/`validate` with no logic copied.
- No existing module file modified except `src/routes/index.js` (one new mount).
- `npm run build` passes; `require('./src/routes')` resolves.
- Response envelope and status codes match existing conventions.
- Plan approved and implemented by an implementation-capable agent.
