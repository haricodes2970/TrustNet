# Deployment

## Backend

Required environment:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM` when email delivery is configured

Recommended:

- Use a strong `JWT_SECRET`.
- Use MongoDB Atlas or a managed MongoDB service.
- Enable HTTPS in production.
- Set `NODE_ENV=production`.

## Frontend

Build:

```bash
cd client
npm run build
```

Deploy `client/dist` to a static host. Configure API proxy or environment-specific API base URL before production release.

## Pre-Deployment Checks

- Backend starts.
- MongoDB connects.
- Frontend builds.
- Auth register/login/refresh/logout work.
- Protected frontend dashboard redirects correctly.
