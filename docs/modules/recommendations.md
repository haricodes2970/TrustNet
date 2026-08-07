# Module: Recommendations

Files: `src/routes/recommendation.routes.js`, `src/controllers/recommendationController.js`, `src/services/recommendationService.js`.

Audited and hardened in the Search + Recommendations phase.

## Routes (`/api/v1/recommendations`) — auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | get recommendations for current user: startups, communities, users, posts, marketplace listings |

## Service (`recommendationService.js`)

`getRecommendations(userId)` — five parallel queries (startups, communities, users, newest posts, most-liked posts, marketplace listings), the two post queries deduplicated by `_id` before returning.

## What changed this phase

Every recommendation query was missing at least one of the visibility filters its own module's public surface already enforces - each fixed to match its module's established rules exactly:

- **Startup**: added `isSuspended: false, deletedAt: null` (previously only `status`/`isPublic`) - a suspended or soft-deleted startup could be recommended despite being excluded from `listStartups` and search.
- **Community**: added `isHidden: false, deletedAt: null` (previously only `isActive`) - an admin-hidden or deleted community could be recommended.
- **Post**: added `isHidden: false, deletedAt: null` (previously only `visibility`) - a hidden or deleted post could surface in "newest"/"trending".
- **User**: added an explicit `deletedAt: null` (previously relied only on `isActive: true`, which happens to also be set false by `softDeleteUser` today but isn't a guaranteed coupling).

**Marketplace recommendations added** (VERIFY: "if implemented" - low-risk given `searchServiceListings`'s identical rules already existed to mirror from the same phase).

**"Blocked content"** (named in this phase's checklist): N/A - no user-blocking feature exists in this codebase (Developer 1's `Block` model was explicitly not adopted, see `BACKLOG.md`'s "Backend merge" section). Verified no code path assumes one.

## Removed

- `getRecommendations(email)` resolved the acting user via `userService.getUserByEmail()` inside the service itself. Same per-request email lookup already fixed in `messageController`/`notificationController`/`interactionService` this session - now takes `userId` directly, and the controller passes `req.user.id`.

## Tests

**Integration** (`test/integration/searchRecommendationLifecycle.test.js`, shared with Search, new this phase - this module had zero test coverage before): auth requirement, the full visibility-exclusion matrix across all five sections, self-exclusion from user recommendations, and newest/most-liked post dedup.
