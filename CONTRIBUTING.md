# Contributing

How to contribute to TrustNet. This is a thin index over existing process docs in [docs/](docs/) — full detail lives there, not duplicated here.

## Setup

See [README.md](README.md) for install/run instructions (`client/` and `server/`).

## Project rules

Architecture and coding rules: [docs/DEVELOPER_RULES.md](docs/DEVELOPER_RULES.md) — MVC + Service structure, no duplication, Joi validation on writes, consistent JSON responses, never store raw passwords/tokens, keep frontend/backend routes aligned, update docs on behavior change.

## Branching & commits

[docs/GITHUB_HELP.md](docs/GITHUB_HELP.md): `main` (stable), `develop` (integration), `feature/`, `fix/`, `docs/` prefixes. Commit format: Conventional Commits (`type(scope): message`), matching this repo's existing log (e.g. `feat(dashboard): add trending posts widget`).

## Workflow

[docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md): pull latest `develop`, branch, make a focused change, run checks, push, open PR, request review, merge after approval. Daily status format: Yesterday / Today / Blockers / PR-Issue.

## Opening issues / PRs

Templates: [docs/ISSUE_TEMPLATES.md](docs/ISSUE_TEMPLATES.md) (feature: Goal/User Story/API-UI Changes/Acceptance Criteria/Owner/Deadline; bug: What happened/Expected/Steps/Screenshots/Severity/Owner), [docs/PULL_REQUEST_TEMPLATE.md](docs/PULL_REQUEST_TEMPLATE.md) (Summary/Files Changed/How Tested/Screenshots/Checklist).

## Code review

Checklist: [docs/CODE_REVIEW_CHECKLIST.md](docs/CODE_REVIEW_CHECKLIST.md) — solves the issue, consistent naming, validated inputs, centralized error handling, secure password/token handling, efficient queries, frontend loading/error/success states, docs updated, test notes included.

## Testing before you push

No automated suite exists yet (see [BACKLOG.md](BACKLOG.md)). Use [docs/MANUAL_TESTING_CHECKLIST.md](docs/MANUAL_TESTING_CHECKLIST.md) and [docs/POSTMAN_GUIDE.md](docs/POSTMAN_GUIDE.md) (`docs/TrustNet.postman_collection.json`) to exercise changed endpoints manually. Run `npm run build` in `Main/server` at minimum to catch load-time errors.

## Adding/changing an API endpoint

Follow the checklist in [API_GUIDELINES.md](API_GUIDELINES.md#adding-a-new-endpoint).

## Documentation updates

If your change affects behavior, update the relevant file(s):

- Module-level: [docs/modules/](docs/modules/)
- Schema: [DATABASE.md](DATABASE.md)
- Endpoints: [docs/ENDPOINTS.md](docs/ENDPOINTS.md), [API_GUIDELINES.md](API_GUIDELINES.md)
- Security-relevant: [SECURITY.md](SECURITY.md)
- Roadmap/backlog status: [ROADMAP.md](ROADMAP.md), [BACKLOG.md](BACKLOG.md)
- Notable user-facing/API change: [CHANGELOG.md](CHANGELOG.md)
