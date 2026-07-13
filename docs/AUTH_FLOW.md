# Authentication Flow

1. User registers with full name, username, email, and password.
2. Backend hashes the password and creates email verification metadata.
3. User logs in with email and password.
4. Backend returns an access token and sets `trustnet_refresh` as an httpOnly cookie.
5. Frontend stores the access token in memory through `AuthContext`.
6. Axios sends the access token as `Authorization: Bearer <token>`.
7. If an API request returns `401`, Axios calls `/auth/refresh`.
8. Refresh validates and rotates the refresh token.
9. Logout clears refresh token storage and browser cookie.

Development responses include verification/reset tokens so the flow can be tested without a real email provider. The backend also calls `email.service.js`, which logs a graceful fallback when SMTP is not configured.
