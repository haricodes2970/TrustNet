# TrustNet

TrustNet is a MERN-style collaboration platform for founders, builders, mentors, and investors. The current project contains a React/Vite frontend and an Express/Mongoose backend using an MVC + Service + Repository structure.

## Structure

- `client/` - React, Vite, Tailwind frontend.
- `server/` - Express API, Mongoose models, services, repositories, validators, middleware, Swagger setup.

## Run Locally

Backend:

```bash
cd server
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

## Environment

Create `server/.env` with:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/trustnet
JWT_SECRET=replace-with-a-strong-secret
CLIENT_URL=http://localhost:5173
```

## Current Status

- Backend API structure is in place.
- MongoDB-backed authentication replaces the earlier mock auth.
- CRUD APIs exist for users, startups, communities, posts, comments, likes, and collaboration requests.
- Frontend auth screens are integrated with `/api/v1/auth`.
- Dashboard, profile, communities, connections, and settings now call backend APIs.
- Messages and notifications are still frontend-only placeholders because backend modules for them do not exist yet.
