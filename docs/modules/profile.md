# Module: Profile

Files: `src/routes/profile.routes.js`, `src/controllers/profileController.js`, `src/models/User.js`, `src/services/cloudinary.service.js`. Self-service counterpart to [users.md](users.md).

## Routes (`/api/v1/profile`) — all auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | get own profile |
| PUT | `/` | update own profile |
| POST | `/avatar` | upload avatar (multer -> Cloudinary) |
| DELETE | `/avatar` | remove avatar |

## Controller (`profileController.js`)

`getProfile`, `updateProfile`, `uploadAvatar`, `removeAvatar` — resolves the acting user by identity from the auth token (email-based resolution per survey).

## Validation

`profile.validators.js`: `profileUpdate` schema covers `fullName`, `username`, `email`, `designation`, `location`, `website`, `linkedin`, `bio`, `avatar`, `onboardingCompleted`.

## Notes

Uses Cloudinary for avatar storage — see [ARCHITECTURE.md](../../ARCHITECTURE.md#stack) and [API_GUIDELINES.md](../../API_GUIDELINES.md#file-uploads).
