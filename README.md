# TrustNet

TrustNet is a MERN-style collaboration platform for founders, builders, mentors, and investors. The project contains a React/Vite frontend (`Main/client/`) and an Express/Mongoose backend (`Main/server/`) using an MVC + Service structure. Full docs index: [ARCHITECTURE.md](ARCHITECTURE.md), [API_GUIDELINES.md](API_GUIDELINES.md), [DATABASE.md](DATABASE.md), [SECURITY.md](SECURITY.md), [ROADMAP.md](ROADMAP.md), [BACKLOG.md](BACKLOG.md), [CONTRIBUTING.md](CONTRIBUTING.md), [docs/modules/](docs/modules/).

## Structure

- `Main/client/` - React, Vite, Tailwind frontend.
- `Main/server/` - Express API, Mongoose models, services, validators, middleware, Swagger setup. No repository layer exists — services call Mongoose models directly (see [ARCHITECTURE.md](ARCHITECTURE.md)).

## Run Locally

Backend:

```bash
cd Main/server
npm install
npm run dev
```

Frontend:

```bash
cd Main/client
npm install
npm run dev
```

## Environment

Copy the template and fill it in — it documents every required and optional variable, and what breaks when an optional one is missing:

```bash
cd Main/server
cp .env.example .env
```

All of the following are **required**: `src/config/env.js` validates them at startup and exits with a non-zero code listing anything missing.

```env
MONGO_URI=mongodb://127.0.0.1:27017/trustnet
JWT_SECRET=replace-with-a-strong-secret
JWT_ACCESS_SECRET=replace-with-a-different-strong-secret
JWT_REFRESH_SECRET=replace-with-a-third-strong-secret
JWT_EXPIRES_IN=7d
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=http://localhost:5173
```

Optional (the server boots without them): `PORT`, `NODE_ENV`, the `SMTP_*` block (without it, verification/reset emails fail but the underlying account actions still succeed), `TWO_FACTOR_ENCRYPTION_KEY` (required only to enable 2FA), the Google/LinkedIn OAuth blocks, and `MONGODB_DNS_SERVERS`. The AI endpoints need no configuration — they ship with a built-in deterministic provider requiring no API key.

The frontend needs `Main/client/.env` with `VITE_API_URL` (see `Main/client/.env.example`).

## Current Status

- Backend API structure is in place: auth, users, profile, startups, communities, posts/comments/likes, collaborations, teams, messages, notifications, settings, search, recommendations, verification, admin, dashboard. See [docs/modules/](docs/modules/) for one doc per module.
- MongoDB-backed authentication with JWT access/refresh tokens, Google/LinkedIn OAuth, and TOTP 2FA (see [SECURITY.md](SECURITY.md)).
- Messages and notifications now have full backend modules (routes/controllers/services/models) — no longer frontend-only placeholders.
- Automated test suite: `node --test`, ~844 unit + HTTP-level integration tests covering every module's authorization, lifecycle, and error contracts, plus an end-to-end tester smoke test. Run with `npm run test:all` from `Main/server/`. No CI pipeline yet (see [BACKLOG.md](BACKLOG.md)).

## TODO

- Confirm current frontend integration coverage per screen (dashboard/profile/communities/connections/settings) against backend routes — not re-verified in this pass.
