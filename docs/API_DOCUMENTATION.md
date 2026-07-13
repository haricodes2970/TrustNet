# API Documentation

Base URL: `/api/v1`

Response shape:

```json
{ "success": true, "data": {} }
```

Error shape:

```json
{ "success": false, "message": "Validation failed.", "details": [] }
```

## Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/verify-email?token=...`
- `POST /auth/resend-verification`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `PUT /auth/change-password`
- `GET /auth/sessions`
- `DELETE /auth/sessions/current`

## Resources

- Users: `/users`
- Startups: `/startups`
- Communities: `/communities`
- Posts: `/posts`
- Comments: `/comments`
- Likes: `/likes`
- Collaboration requests: `/collaborations`

List endpoints support `page`, `limit`, `sortBy`, `sortOrder`, `search`, and resource-specific filters where configured.

Create, update, delete, collaboration inbox, comments, and likes require `Authorization: Bearer <accessToken>`.

Ownership is inferred from the authenticated user. Clients should not send trusted ownership fields such as `author`, `owner`, `founder`, `sender`, or `user`; the backend sets those from the access token.
