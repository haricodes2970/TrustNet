# Module: Startups

Files: `src/routes/startup.routes.js`, `src/controllers/startupController.js`, `src/services/startupService.js`, `src/validators/startup.validators.js`, `src/models/Startup.js`. See [DATABASE.md](../../DATABASE.md#startup-startupjs).

## Routes (`/api/v1/startups`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | — | list startups (pageable) |
| GET | `/:id` | — | get by id |
| GET | `/slug/:slug` | — | get by slug |
| POST | `/me` | required | list current user's startups |
| POST | `/` | required | create (founder = req.user.id) |
| PUT | `/:id` | required, owner | update |
| DELETE | `/:id` | required, owner | delete |

## Controller (`startupController.js`)

`createStartup`, `getStartup`, `getStartupBySlug`, `getMyStartups`, `updateStartup`, `deleteStartup`, `listStartups`.

## Service (`startupService.js`)

`createStartup`, `getStartupById`, `getStartupBySlug`, `listMyStartups`, `updateStartup`, `deleteStartup`, `listStartups`.

## Validation

`startupCreate`, `startupUpdate` — name, slug, tagline, description, category, stage, location, websiteUrl, pitchDeckUrl, logoUrl, problemStatement, solution, targetMarket, fundingGoal, fundingRaised, currency, status, tags, isFeatured, isPublic.

## Notes

Commit `135e7d3 feat(startup): secure startup management` added ownership enforcement — see [SECURITY.md](../../SECURITY.md). A `Startup` fans out to [teams.md](teams.md) (1 startup : N teams), [collaborations.md](collaborations.md), [workspace.md](workspace.md) (1:1), and [hiring.md](hiring.md) (1 startup : N jobs).

**Hiring reuses this module's public-read pattern.** `Job`'s public `GET /` / `GET /:id` (unauthenticated, published-only) mirrors the exact split already established here (`Startup`'s own `GET /`/`GET /:id`/`GET /slug/:slug` are public; mutations require auth+ownership) — not a new convention, an extension of this one. Unlike Team/Workspace/Project/Task/Milestone/Documents, `Job` resolves its founder/admin/contributor role **independently** of this module's `Team` relationship data path — it duplicates the role computation rather than routing through `workspaceService`, by explicit design (see [hiring.md](hiring.md)).
