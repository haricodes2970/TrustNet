# Team Roles

Final presentation deadline: 17 July

## Srujana SG - Team Lead & Backend APIs

- Responsibilities: coordinate backend delivery, review API contracts, finalize endpoint coverage.
- Folders: `server/src/routes`, `server/src/controllers`, `server/src/services`.
- Issues: CRUD completion, API consistency, final backend review.
- Deliverables: stable API, merged backend branches, final status report.
- Checklist: endpoints tested, docs updated, PRs reviewed.
- Dependencies: authentication, database, frontend integration.

## Hari - Infrastructure, Deployment, Testing, Swagger

- Responsibilities: environment setup, Swagger checks, deployment guide, API testing.
- Folders: `server/src/docs`, root documentation, deployment config.
- Issues: Postman collection, Swagger verification, deployment checklist.
- Deliverables: runnable deployment notes and API test evidence.
- Checklist: backend starts, MongoDB connects, collection works.
- Dependencies: backend endpoint stability.

## Pranathi - Authentication, Security, Middleware

- Responsibilities: auth flow, middleware, validation, security review.
- Folders: `server/src/routes/auth.routes.js`, `server/src/services/authService.js`, `server/src/middlewares`.
- Issues: refresh token flow, password reset, route protection.
- Deliverables: secure auth flow and middleware documentation.
- Checklist: register/login/refresh/logout/change password verified.
- Dependencies: User model and frontend auth screens.

## Shubham - Frontend Pages & Dashboard

- Responsibilities: build real dashboard pages from placeholders.
- Folders: `client/src/pages`, `client/src/components/layout`.
- Issues: profile, connections, communities, messages pages.
- Deliverables: functional dashboard sections.
- Checklist: responsive pages, loading/error states, API integration points.
- Dependencies: finalized backend APIs.

## Ramya - Frontend UI/UX & API Integration

- Responsibilities: UI polish, form UX, connect frontend services to backend.
- Folders: `client/src/services`, `client/src/components`, `client/src/pages`.
- Issues: API mismatch fixes, auth UX, reusable components.
- Deliverables: integrated user flows with polished UI.
- Checklist: no 404/500 from normal UI flows, consistent form validation.
- Dependencies: backend route stability.

## Harsh - Frontend Testing, Responsive Design & Bug Fixes

- Responsibilities: responsive QA, browser testing, bug verification.
- Folders: `client/src`, test docs.
- Issues: mobile fixes, auth route testing, dashboard QA.
- Deliverables: QA notes and fixed UI bugs.
- Checklist: mobile/desktop checked, forms tested, protected routes verified.
- Dependencies: frontend pages and backend availability.
