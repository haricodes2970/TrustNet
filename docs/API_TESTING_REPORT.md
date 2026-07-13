# API Testing Report

## Verified by Static and Build Checks

- Backend app module loads successfully.
- Frontend production build succeeds.
- Postman collection JSON is valid.
- Validation middleware is attached to core resource routes.
- Mutation routes require authentication.
- Ownership is enforced for users, startups, communities, posts, comments, likes, and collaboration request responses.

## Requires Live MongoDB Verification

- Full register/login/refresh/logout cycle.
- Real CRUD writes for every model.
- Duplicate unique index behavior.
- Expired token behavior.
- Cloudinary upload behavior.
- Email transport delivery.

## Known Test Gap

`server/package.json` still has no automated test suite. It currently runs a placeholder test command. Add Jest or Node test runner coverage before production deployment.
