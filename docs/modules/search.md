# Module: Search

Files: `src/routes/search.routes.js`, `src/controllers/searchController.js`, `src/services/searchService.js`.

Audited and hardened in the Search + Recommendations phase.

## Routes (`/api/v1/search`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | — (public, `searchLimiter`-rate-limited) | search across entities: `?q=`, `?type=users\|startups\|communities\|posts\|listings`, `?limit=`, `?skip=` |

## Service (`searchService.js`)

`globalSearch`, `searchUsers`, `searchStartups`, `searchCommunities`, `searchPosts`, `searchServiceListings`.

## What changed this phase

- **Marketplace search added** (explicit VERIFY requirement, previously missing entirely). New `searchServiceListings` mirrors `serviceListingService.listListingsForUser`'s public-subset rules exactly: `published`, not archived/hidden/deleted, and the provider's account must be active (reuses `providerProfileService.listInactiveProviderIds` - the canonical owner of that check, not duplicated).
- **Pagination** (`limit`/`skip`, clamped to a max of 50) added to every category - previously a hardcoded, unconfigurable `limit(10)`.
- **Single-category filtering** via `?type=`, instead of always fanning out to every collection.
- **Explicit sort** (`-createdAt`) added to every category for deterministic ordering - previously unordered.
- Query term capped at 200 characters (defense-in-depth).

## Reviewed and left unchanged (documented, not accidental)

- **Regex-based substring search, not `$text`.** `Startup`'s `{name,tagline,description}` text index and `Post`'s `{title,content,tags}` text index both go unused by this service - a `$text` query would only match on tokenized/stemmed terms, breaking partial/prefix matching (e.g. "eag" would no longer match "eagle") that this regex-based approach supports. This was an open verification item in `BACKLOG.md`; now explicitly resolved as an intentional tradeoff, not an oversight.
- **Regex metacharacters are already escaped** (`escapeRegex`) before being wrapped in a case-insensitive regex - confirmed safe against both regex injection and ReDoS (the user's input can never introduce nested quantifiers, since every metacharacter becomes a literal). Verified, not newly fixed.
- **Private/restricted communities stay searchable**, matching the Communities hardening phase's explicit design decision - only a community's `visibility:"community"` posts are membership-gated, not the community's own discoverability.
- **No dedicated rate limiter beyond the existing `searchLimiter`** - already present and unchanged; this phase didn't add a new one.

## Tests

**Integration** (`test/integration/searchRecommendationLifecycle.test.js`, shared with Recommendations, new this phase - this module had zero test coverage before): per-category visibility exclusion (including the new Marketplace listing search), pagination + clamping, injection safety, single-category filtering.
