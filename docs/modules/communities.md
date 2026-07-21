# Module: Communities

Files: `src/routes/community.routes.js`, `src/controllers/communityController.js`, `src/services/communityService.js`, `src/validators/community.validators.js`, `src/models/Community.js`. See [DATABASE.md](../../DATABASE.md#community-communityjs).

## Routes (`/api/v1/communities`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | — | list communities |
| GET | `/:id` | — | get by id |
| GET | `/slug/:slug` | — | get by slug |
| POST | `/` | required | create |
| PUT | `/:id` | required | update |
| DELETE | `/:id` | required | delete |
| POST | `/:id/join` | required | join |
| POST | `/:id/leave` | required | leave |

## Controller (`communityController.js`)

`createCommunity`, `getCommunity`, `getCommunityBySlug`, `updateCommunity`, `deleteCommunity`, `joinCommunity`, `leaveCommunity`, `listCommunities`.

## Service (`communityService.js`)

`createCommunity`, `getCommunityById`, `getCommunityBySlug`, `updateCommunity`, `deleteCommunity`, `joinCommunity`, `leaveCommunity`, `listCommunities`.

## Validation

`communityCreate`, `communityUpdate` — name, slug, description, category, type, rules, tags, coverImageUrl.

## Notes

Communities relate 1:N to [posts.md](posts.md) (`Post.community`).
