# TOMORROW — Testing + What "Done" Means

No new building tomorrow. Just test, fix, build, deploy.

---

## Who tests whose work (nobody tests their own)
- P2 tests P3 (Startup)
- P3 tests P4 (Hiring)
- P4 tests P5 (Network)
- P5 tests P2 (Identity)
- Srujana tests the whole app + does the deploy

## Tomorrow's rough plan
| Time | Do |
|---|---|
| 9:30–10:00 | Check `npm run build` passes, no red errors |
| 10:00–11:00 | Test login + roles (all 4 roles, logged out, blocked pages) |
| 11:00–12:00 | Test Startup + Workspace |
| 12:00–1:00 | Test Hiring + start building Funding (P4) |
| 1:00–2:00 | Test Feed, Search, Marketplace, Chat |
| 2:00–3:00 | Test on phone / tablet / desktop |
| 3:00–4:00 | Test errors + broken-API + blocked actions |
| 4:00–5:00 | Fix urgent bugs |
| 5:00–end | Final build → deploy → sign off |

For each area check: does it work · empty screen · error screen · loading screen · works on phone · right buttons hidden for wrong role · real data (no fake data).

---

## DONE by 4:30 TODAY
- New colors + fonts everywhere, no old emerald / no glass
- Main pages show real backend data
- Loading / empty / error / success screens on P0 pages
- Works on phone (basic)
- No fake `mockData` left in the app
- Everyone's branch merged into one build, `npm run build` passes, no red errors

## DONE after tomorrow (project finished)
- Full testing passed, bugs fixed
- Works on phone / tablet / desktop
- Deployed and verified

## Left for later (P1) — write these in a list, don't build today
Funding (all of it — P4 builds tomorrow), Projects/Tasks/Milestones/Documents, Communities, Post comments, Chat reading, Create/Manage Job, Settings/Security/Sessions.

## Known backend gaps (not our bug — tell the backend owner)
- No "view another person's full profile" endpoint.
- Sending a chat message not confirmed to exist.
