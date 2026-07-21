# Module: Settings

Files: `src/routes/settings.routes.js`, `src/controllers/settingsController.js`, `src/services/settingsService.js`, `src/validators/settings.validators.js`, `src/models/UserPreference.js`. See [DATABASE.md](../../DATABASE.md#userpreference-userpreferencejs).

## Routes (`/api/v1/settings`) — all auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | get combined profile + preferences |
| PUT | `/profile` | update profile (validated) |
| PUT | `/preferences` | update notification preferences (validated) |
| PUT | `/privacy` | update privacy settings (validated) |
| PUT | `/appearance` | update appearance settings (validated) |
| GET | `/sessions` | list active sessions |
| DELETE | `/sessions/:id` | revoke session |

## Controller (`settingsController.js`)

`getSettings`, `updateProfile`, `updatePreferences`, `updatePrivacy`, `updateAppearance`, `getSessions`, `deleteSession`.

## Validation

`settings.validators.js`: `preferences`, `privacy`, `appearance`.

## Notes

Session list/revoke endpoints exist here — cross-check against the "session model" open question in [ROADMAP.md](../../ROADMAP.md#open-questions-from-backlog-appendix-b) (stateless JWT vs persistent Session store) before assuming full session tracking is implemented server-side.
