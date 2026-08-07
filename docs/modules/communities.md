# Module: Communities

Files: `src/routes/community.routes.js`, `src/controllers/communityController.js`, `src/services/communityService.js`, `src/validators/community.validators.js`, `src/models/Community.js`. See [DATABASE.md](../../DATABASE.md#community-communityjs).

Audited and hardened in the Communities + Posts + Comments + Likes phase. This module predates every other convention in this codebase (built in the earliest commits, before `ApiError`/authorization/soft-delete patterns existed) - its own pre-hardening doc flagged auth requirements as "uncertain." Every issue found this phase was a genuine bug, not a documented tradeoff.

## Routes (`/api/v1/communities`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | optional | list communities (search via `?search=`) |
| GET | `/:id` | optional | get by id (404-concealed if hidden/deleted, unless owner/admin) |
| GET | `/slug/:slug` | optional | get by slug (same concealment) |
| POST | `/` | required | create (one namespace, platform-wide unique name) |
| PUT | `/:id` | required + admin override | update |
| DELETE | `/:id` | required + admin override | soft delete |
| POST | `/:id/restore` | required + admin override | restore |
| POST | `/:id/join` | required | join (public communities only) |
| POST | `/:id/leave` | required | leave |

## Service (`communityService.js`)

`createCommunity`, `getCommunityById`, `getCommunityBySlug`, `getCommunityForViewer`, `getCommunityBySlugForViewer`, `updateCommunity`, `deleteCommunity`, `restoreCommunity`, `listCommunities`, `joinCommunity`, `leaveCommunity`, `isMemberOfCommunity`, `listMemberCommunityIds`, `assertNoDuplicateName`.

## What changed this phase

- **Soft delete.** `deleteCommunity` was a hard delete (`findByIdAndDelete`) despite `deletedAt` already existing on the schema - orphaned every `Post` referencing the community, with no way back. Now soft-delete + `restoreCommunity`, symmetric with the admin-moderation "delete" action (`adminModerationService`), which was already soft.
- **Owner auto-membership.** `createCommunity` never added the owner to `members[]` - `memberCount` started at 0 even though an owner already exists and can post/moderate.
- **Duplicate-name prevention.** Case-insensitive, platform-wide (a Community's name is a single shared namespace, unlike Startup's per-founder scoping).
- **Platform-admin override** on update/delete/restore (previously only the separate admin-moderation hide/restore/delete endpoint had any admin capability).
- **View concealment.** `getCommunityById`/`BySlug` had zero visibility gating - a community an admin hid, or that's been deleted, was still returned to anyone. `getCommunityForViewer`/`BySlugForViewer` now conceal it (404) from anyone but the owner or a platform admin.
- **Atomic, drift-free membership counters.** `joinCommunity`/`leaveCommunity` previously incremented/decremented `memberCount` even when the underlying `$addToSet`/`$pull` was a no-op (an existing member re-joining, or a non-member leaving, silently drifted the counter forever, with only a negative-clamp safety net). Rewritten as a single atomic aggregation-pipeline `findByIdAndUpdate` (requires Mongoose's `updatePipeline: true` option - Mongoose 9 no longer auto-detects an array update as a pipeline): `memberCount` is now always derived from the post-update array size in the same operation, never a separately-tracked counter. Duplicate join / absent-membership leave now reject with 409 instead of a silent no-op.
- **Private-community self-join gate.** No invite/request system exists for Community (unlike Team's pending/accepted invite flow), so self-join now only works for `type: "public"`; a `private`/`restricted` community's membership can only be granted by its owner out-of-band. A real invite flow is a deliberate out-of-scope deferral, not an oversight - see BACKLOG.md.
- **Owner-leave protection.** `leaveCommunity` now blocks the owner from leaving their own community (mirrors Team's owner-removal protection).
- Status-code correction throughout (every "not found"/"not authorized" throw was a plain `Error`, controllers fell back to 400).
- Audit logging on create/update/delete/restore/join/leave.

## Notes

Communities relate 1:N to [posts.md](posts.md) (`Post.community`); a post with `visibility: "community"` is only viewable by a member of that community (`communityService.isMemberOfCommunity`, reused by `postService`, not duplicated).
