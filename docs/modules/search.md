# Module: Search

Files: `src/routes/search.routes.js`, `src/controllers/searchController.js`, `src/services/searchService.js`.

## Routes (`/api/v1/search`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | — (public) | search across entities |

## Controller / Service

`searchController.js`: `search`. `searchService.js`: full-text search implementation.

## Notes

Backed by Mongoose text indexes on `Startup` (`name`, `tagline`, `description`) and `Post` (`title`, `content`, `tags`) — see [DATABASE.md](../../DATABASE.md). Whether the service actually leverages these indexes (vs regex scan) is a Phase 5 verification item in [BACKLOG.md](../../BACKLOG.md).
