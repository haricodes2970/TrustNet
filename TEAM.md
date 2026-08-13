# Team

Team roster and ownership. Source of truth for role assignment is [docs/ROLES.md](docs/ROLES.md) — this file summarizes it and cross-references workflow docs. If the two ever disagree, treat [docs/ROLES.md](docs/ROLES.md) as authoritative and update this summary.

## Roster

Per [docs/ROLES.md](docs/ROLES.md), the team currently consists of 7 members:

| Member   | Responsibility          |
| -------- | ----------------------- |
| Srujana  | Team lead, backend APIs |
| Hari     | Infra, Swagger, testing |
| Pranathi | Auth & security         |
| Shubham  | Frontend pages          |
| Ramya    | UI / integration        |
| Harsh    | QA / responsive design  |
| Disha    | Frontend development    |

**Original target deadline:** 17 July

> **Note:** Disha is a newly added team member and is responsible for frontend development. The roster should be kept synchronized with [docs/ROLES.md](docs/ROLES.md), which remains the authoritative source for role assignments.

## Ownership boundaries

Feature work is scoped to avoid cross-editing other members' files where possible — see [.kilo/plans/1784538942522-backend-feature-reorg-plan.md](.kilo/plans/1784538942522-backend-feature-reorg-plan.md) for an example (Startup Teams module built as an isolated domain, only touching `src/routes/index.js` outside its own new files).

Frontend work should be coordinated between **Shubham, Disha, Ramya, and Harsh** to avoid conflicting changes and duplicated implementation.

## Workflow

Daily update format, branching, and PR flow: [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md).

Git conventions (branch naming, commit format): [docs/GITHUB_HELP.md](docs/GITHUB_HELP.md).

Issue/PR templates: [docs/ISSUE_TEMPLATES.md](docs/ISSUE_TEMPLATES.md), [docs/PULL_REQUEST_TEMPLATE.md](docs/PULL_REQUEST_TEMPLATE.md).

Code review bar: [docs/CODE_REVIEW_CHECKLIST.md](docs/CODE_REVIEW_CHECKLIST.md).

All team members should follow the documented branching, PR, review, and daily-update workflow.

## Contact / escalation

TODO: No escalation contact list found in the repo beyond the roster above. Add one here once defined.

## Roster Maintenance

When a new member joins or an existing member changes responsibilities:

1. Update [docs/ROLES.md](docs/ROLES.md) first.
2. Update this `TEAM.md` summary to match.
3. Confirm ownership boundaries for the new responsibility.
4. Ensure the member follows the existing branching and PR workflow.
