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

Create `Main/server/.env` with (see `src/config/env.js` for the full required/optional list):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/trustnet
JWT_SECRET=replace-with-a-strong-secret
JWT_ACCESS_SECRET=replace-with-a-strong-secret
JWT_REFRESH_SECRET=replace-with-a-strong-secret
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Current Status

- Backend API structure is in place: auth, users, profile, startups, communities, posts/comments/likes, collaborations, teams, messages, notifications, settings, search, recommendations, verification, admin, dashboard. See [docs/modules/](docs/modules/) for one doc per module.
- MongoDB-backed authentication with JWT access/refresh tokens, Google/LinkedIn OAuth, and TOTP 2FA (see [SECURITY.md](SECURITY.md)).
- Messages and notifications now have full backend modules (routes/controllers/services/models) — no longer frontend-only placeholders.
- No automated test suite or CI pipeline yet (see [BACKLOG.md](BACKLOG.md)).

## TODO

- Confirm current frontend integration coverage per screen (dashboard/profile/communities/connections/settings) against backend routes — not re-verified in this pass.
