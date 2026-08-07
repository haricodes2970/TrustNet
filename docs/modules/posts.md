# Module: Posts & Interactions

Files: `src/routes/post.routes.js`, `src/controllers/postController.js`, `src/controllers/interactionController.js`, `src/services/postService.js`, `src/services/interactionService.js`, `src/validators/post.validators.js`, `src/validators/interaction.validators.js`, `src/models/Post.js`, `src/models/Comment.js`. See [DATABASE.md](../../DATABASE.md#post-postjs).

Audited and hardened in the Communities + Posts + Comments + Likes phase, alongside [communities.md](communities.md). Same pre-hardening-era code as Community - the most severe finding of the whole phase was here (see below).

## Routes (`/api/v1/posts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | required | create post (validated) |
| GET | `/` | optional | list posts, scoped to what the viewer may see |
| GET | `/:id` | optional | get by id (404-concealed per visibility rules) |
| PUT | `/:id` | required + admin override | update |
| DELETE | `/:id` | required + admin override | soft delete |
| POST | `/:id/restore` | required + admin override | restore |
| POST | `/:id/like` | required + admin override | like |
| DELETE | `/:id/like` | required | unlike |
| GET | `/:id/comments` | optional | list comments (respects the post's own visibility) |
| POST | `/:id/comments` | required | add comment (validated) |
| PUT | `/comments/:commentId` | required | edit comment (owner only) |
| DELETE | `/comments/:commentId` | required + admin override | delete comment |
| POST | `/comments/:commentId/restore` | required + admin override | restore comment |

## What changed this phase

- **Critical: authentication was entirely missing.** `POST /`, `PUT /:id`, `DELETE /:id` had no `authenticate` middleware at all - any caller, including a fully unauthenticated one, could create, edit, or delete **any** post. Fixed: `authenticate` + `authorize()` (populates `req.user.role` for the admin override) on every mutation route.
- **No validator existed for Post at all.** New `postCreate`/`postUpdate` Joi schemas (`post.validators.js`).
- **No ownership check anywhere** (not even in the controller, unlike Community) - any authenticated user could edit or delete any other user's post. Fixed via `assertOwner` + `isAdmin` bypass in the service, matching every other hardened module.
- **Soft delete.** `deletePost` was a hard delete (`findByIdAndDelete`) despite `deletedAt` already existing on the schema - orphaned every `Comment` referencing the post. Now soft-delete + `restorePost` (blocked while the parent community is still deleted, same parent-must-be-active-first invariant as every other restore in this codebase).
- **Visibility enforcement.** Zero enforcement previously existed - a `private` or `community`-only post was readable by anyone, including anonymous visitors, since neither `getPostById` nor `listPosts` ever checked `visibility`. New `getPostForViewer`/`assertPostViewAccess`: `private` is author-only, `community` requires membership in `post.community` (via `communityService.isMemberOfCommunity`), `public` is open to all; a hidden/deleted post is concealed (404) from anyone but the author or a platform admin. `listPostsForUser` applies the same scoping to list results ("scope, don't reject" convention).
- Status-code correction throughout.
- Audit logging on create/update/delete/restore.

### Interactions (Likes)

- **Removed a legacy email-based `resolveUser()`** that silently **created a new `User` record** on a lookup miss - a relic of a pre-JWT "mock auth" era. `authenticate` already guarantees `req.user.id` references a real, persisted `User`, so every function now takes `userId` directly, like every other service in this codebase.
- **Race-condition fix.** `likePost`/`unlikePost` were a non-atomic read-modify-write (fetch the whole `Post`, mutate the `likes` array in memory, `.save()` the entire document back) - two concurrent likes could lose an update. Rewritten as a single atomic aggregation-pipeline `findByIdAndUpdate` (`updatePipeline: true` - Mongoose 9 requires this explicitly for an array-shaped update, it no longer auto-detects a pipeline): `likeCount` is always derived from the post-update array size in the same operation. Duplicate like / absent-like unlike now reject with 409 instead of silently no-op'ing.
- Can't like or comment on a post you can't see (reuses `postService.assertPostViewAccess`).

### Interactions (Comments)

- **Soft delete.** `deleteComment` was a hard delete (`comment.deleteOne()`) despite `isHidden`/`deletedAt` already existing on the schema. Now soft-delete + `restoreComment` (blocked while the parent Post is still deleted). A platform admin can delete a comment through this same endpoint; editing someone else's content stays owner-only (same split `Application`'s `updateResume`/`updateCoverLetter` established).
- **`Post.commentCount` sync with admin moderation.** Hiding or deleting a `Comment` via the generic admin-moderation endpoint never adjusted the parent `Post.commentCount` - it only ever climbed and never came back down. `adminModerationService`'s `comments` handler now adjusts it on an actual visibility transition (idempotent re-hide/re-delete no longer double-decrements).
- `postService.updatePost`/`communityService.updateCommunity` now enforcing ownership meant `adminModerationService`'s `posts`/`communities` handlers had to move to going straight to the model (matching how `Job`/`ServiceListing`'s moderation handlers already worked), since a platform admin isn't the post's author or the community's owner.

## Tests

**Integration** (`test/integration/socialLifecycle.test.js`, 30 HTTP-level tests, new this phase - this module had zero test coverage before): full Community + Post + Like + Comment lifecycle, permission matrices, visibility matrix, counter accuracy, admin override, admin-moderation integration.
