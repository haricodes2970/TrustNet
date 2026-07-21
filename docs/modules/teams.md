# Module: Teams

Files: `src/routes/team.routes.js`, `src/controllers/teamController.js`, `src/services/teamService.js`, `src/validators/team.validators.js`, `src/models/Team.js`. Built per [.kilo/plans/1784538942522-backend-feature-reorg-plan.md](../../.kilo/plans/1784538942522-backend-feature-reorg-plan.md) as an isolated feature module. See [DATABASE.md](../../DATABASE.md#team-teamjs).

## Routes (`/api/v1/teams`) — all auth required

| Method | Path | Purpose |
|---|---|---|
| POST | `/` | create team (verifies startup founder) |
| GET | `/` | list teams |
| GET | `/:id` | get one team |
| PUT | `/:id` | update name/description |
| DELETE | `/:id` | soft-archive |
| POST | `/:id/members` | invite member by email |
| PUT | `/:id/members/:memberId/accept` | accept invite |
| DELETE | `/:id/members/:memberId` | remove/leave |
| PUT | `/:id/members/:memberId/role` | change member role |

## Controller (`teamController.js`)

`createTeam`, `listTeams`, `getTeam`, `updateTeam`, `archiveTeam`, `inviteMember`, `acceptInvite`, `removeMember`, `changeMemberRole`.

## Service (`teamService.js`)

CRUD + membership management (invite, accept, remove, role change).

## Model

`Team`: belongs to one `Startup`; `members[]` sub-docs carry `user` (nullable until accepted), `email`, `name`, `role` (admin/member), `status` (pending/active), `invitedBy`, `invitedAt`, `joinedAt`.

## Dependencies

Reuses (read-only, per the feature plan): `Startup` model, `userService` (`getUserByEmail`), `notificationService`, `email.service`, `authenticate`, `authorize`, `validate`, `ApiError`, `serviceUtils` (`assertOwner`, `handleServiceError`, `applyQueryOptions`, `normalizeFilter`). Invite flow: pending member → notification + email → accept to activate.

## Ownership enforcement (Sprint 1 hardening)

Ownership checks (`updateTeam`, `archiveTeam`, `inviteMember`, `changeMemberRole`, plus `assertStartupOwner` in `createTeam`) now go through a shared `assertOwner(resourceOwnerId, userId, message, statusCode?)` helper in `serviceUtils.js`, instead of 6 independently duplicated `String(a) !== String(b)` checks. `startupController.js` update/delete reuse the same helper (passing `403` to preserve its prior `ApiError` status behavior; team call sites omit it and keep their original plain-`Error` → 400 behavior — no status-code regressions on either side).

`inviteMember` now looks up the invitee via `userService.getUserByEmail` instead of querying the `User` model directly — single source of truth for user lookup, matching the service-layer pattern used elsewhere.

`removeMember`'s owner-or-self check was **not** collapsed into `assertOwner` — its logic is "owner OR the member themself," not a pure ownership check, so forcing it into the shared helper would have changed its semantics. Left as-is.

## Notifications (Sprint 1 addition)

Previously only `inviteMember` fired a notification. Now:

| Action | Notification `type` | Recipient |
|---|---|---|
| Invite sent | `team_invite` | invitee (if already a registered user) |
| Invite accepted | `team_invite_accepted` | team owner |
| Member removed by owner | `team_member_removed` | removed member |
| Member leaves (self-removal) | `team_member_left` | team owner |
| Member role changed | `team_member_role_changed` | affected member |

All notification/email side effects remain fire-and-forget (wrapped in try/catch so a notify/email failure never blocks the underlying team mutation), and failures are now logged via `console.error` instead of being silently swallowed — see `teamService.js` catch blocks.

## Known gaps (not changed this sprint)

- Email delivery (`email.service.sendEmail`) still hard-fails if SMTP env vars aren't fully configured; the invite flow swallows that failure (now logged, not fixed) rather than falling back to a dev-log transport.
- No compound uniqueness constraint at the DB layer preventing duplicate pending invites to the same email for the same team — dedupe is enforced at the application layer only (`inviteMember`'s `alreadyMember` check). Left as-is per Sprint 1 scope; single-field indexes on `members.email` / `members.user` remain unchanged.

## Notes

This module was designed to touch only `src/routes/index.js` outside its own files — a pattern worth reusing for future isolated feature work (see [CONTRIBUTING.md](../../CONTRIBUTING.md)).

## Tests

`Main/server/test/serviceUtils.test.js` — unit tests for `assertOwner` (pure function, no DB): match/mismatch, default plain-`Error` behavior, `ApiError`+statusCode behavior, `String()`-based comparison for ObjectId-like values. Run via `npm test` in `Main/server` (now wired to `node --test test/*.test.js`, previously a no-op). No DB-backed integration tests exist yet for `teamService`/`startupController` — no test DB infra (e.g. `mongodb-memory-server`) is present in the repo; adding one is out of Sprint 1 scope.
