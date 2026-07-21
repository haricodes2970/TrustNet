# Module: Recommendations

Files: `src/routes/recommendation.routes.js`, `src/controllers/recommendationController.js`, `src/services/recommendationService.js`.

## Routes (`/api/v1/recommendations`) — auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | get recommendations for current user |

## Controller / Service

`recommendationController.js`: `getRecommendations`. `recommendationService.js`: generates suggestions (connections/startups) for the requesting user.

## Notes

TODO: recommendation algorithm/criteria not confirmed from code survey beyond entry point existing — read `recommendationService.js` directly before documenting logic here rather than guessing.
