# Endpoints

## Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login and set refresh cookie |
| POST | `/api/v1/auth/refresh` | Rotate refresh token and issue access token |
| POST | `/api/v1/auth/logout` | Logout current user |
| GET | `/api/v1/auth/me` | Current user |
| GET | `/api/v1/auth/verify-email` | Verify email token |
| POST | `/api/v1/auth/resend-verification` | Resend verification token |
| POST | `/api/v1/auth/forgot-password` | Create reset token |
| POST | `/api/v1/auth/reset-password` | Reset password |
| PUT | `/api/v1/auth/change-password` | Change logged-in user password |

## CRUD

Each resource exposes the standard collection routes where applicable:

- `GET /`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

Mounted resources:

- `/api/v1/users`
- `/api/v1/startups`
- `/api/v1/communities`
- `/api/v1/posts`
- `/api/v1/comments`
- `/api/v1/likes`
- `/api/v1/collaborations`

Authenticated create/update/delete endpoints infer ownership from the bearer token.
