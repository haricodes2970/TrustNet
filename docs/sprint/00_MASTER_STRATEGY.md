# TRUSTNET SPRINT — READ THIS FIRST (everyone)

Five people. Each person **forks** the repo, builds their pages, and opens a Pull Request. Srujana reviews and merges everyone into the main repo. Build today, test + deploy tomorrow.

**Original repo:** `https://github.com/haricodes2970/TrustNet`
**Frontend folder inside the repo:** `Main\client`

---

## The one rule that matters
**Get your main pages showing REAL backend data BEFORE lunch (12:45).**
After lunch is only 45 minutes — that's for finishing + making pages work on mobile. Nothing else.

## Never wait for anyone
- No login screen yet? → use **DevAuth** (turned on by `.env.local`, step below).
- Need data from another person's page? → use a fake file in `src/dev/fixtures/`.
- A backend endpoint is missing? → **don't fake it.** Post a GAP message (bottom), build the error screen, move on.
- Two people editing the same shared file? → **stop and tell Srujana.**

## Who builds what
| Person | Branch name | Builds |
|---|---|---|
| Srujana (lead) | `frontend/design-foundations` | Shared colors/buttons, page shell, Dashboard, merges everyone |
| P2 | `frontend/identity-trust` | Login, signup, verify, profile |
| P3 | `frontend/startup-workspace` | Startups, team, workspace |
| P4 | `frontend/hiring` | Jobs + applications |
| P5 | `frontend/network-marketplace` | Feed, search, marketplace |

Funding is **not built today** — it's tomorrow (Person 4).

## Turn on DevAuth (do this after cloning)
Make a file `Main\client\.env.local` with these two lines, then run `npm run dev`:
```
VITE_API_URL=https://trustnet-8lr8.onrender.com/api/v1
VITE_DEV_AUTH=1
```
Now you can open any page as any role without logging in.

## The day — 2 breaks built in
| Time | Do |
|---|---|
| 9:30–9:45 | Fork, clone, branch, run the app (your doc has the commands) |
| 9:45–11:00 | Build your page layouts |
| **11:00–11:20** | ☕ Break |
| 11:20–12:45 | **Connect pages to real backend data** ← most important |
| 12:45–1:00 | Tell Srujana your progress |
| **1:00–2:15** | 🍽 Lunch |
| 2:15–3:00 | Finish + make pages work on phone |
| 3:00 | STOP adding features |
| 3:00–3:45 | Push code + open your Pull Request |
| 3:45–4:15 | Test the main flow together |
| 4:15–4:30 | Fix urgent bugs, run `npm run build` |

## The look — follow `07_DESIGN_RULES.md` exactly
That file is the design law, taken straight from the PRD. The short version:
- Colors: paper `#F7F5EF` (background, NOT white), ink `#0E1A2B`, verified `#0F6E5C`, signal `#C8862B`, alert `#B23A32`, slate `#5B6472`. Only these 6.
- Fonts: Fraunces (headings, 24px+ only), IBM Plex Sans (body/forms), IBM Plex Mono (numbers/IDs/amounts/dates).
- Spacing multiples of 8; corners 4px inputs / 8px cards / 0px stamp; ONE shadow `0 2px 8px rgba(14,26,43,0.08)`.
- **LedgerStamp** for every status — always shows text + a date, never color alone.
- Banned: gradients, glassmorphism, pure-white backgrounds, dark+neon, stacked shadows.
- Every page needs 4 screens: loading, empty, error, success.
- Srujana sets these tokens by ~11:00 — you get them free after you sync. **Don't invent your own colors/fonts/shadows.**

👉 Read [07_DESIGN_RULES.md](07_DESIGN_RULES.md) before you build. It also covers responsive + accessibility rules.

## UI/UX — think like a designer (everyone)
Your member doc has a full **"UI/UX Process You Must Follow"** section customized to your module. The order is always the same — don't skip to styling:
1. **User** — who uses this page, their goal, what could confuse them (role personas only: Entrepreneur / Client / Investor / Service Provider / Admin — no invented demographics).
2. **Information architecture** — what's most important, ONE primary action, group related info, break long tasks into steps.
3. **Wireframe first** — structure + all 4 states before any polish. For existing pages, improve the structure, don't preserve the old look.
4. **Visual design** — only now apply the TrustNet colors/fonts/spacing (07_DESIGN_RULES).
5. **Reuse UI patterns** — use the shared components; don't invent a new interaction per page.
6. **Accessibility** — contrast, real labels, keyboard + focus, status never by color alone.
7. **Responsive** — decide how the layout *changes* (nav→drawer, tables→cards), don't just shrink.
8. **Usability-test yourself** — do the main task as a new user; then give a teammate a *task* ("create a startup"), not "does this look good?", and watch where they hesitate.

- **A/B testing:** don't run real experiments this sprint. When two approaches seem fine, compare on clarity / task-completion / cognitive load / consistency / accessibility. Write a hypothesis for later (P1) if useful.
- **Gamification:** only real progress (profile / verification / funding / milestone progress). No points, badges, or leaderboards.
- **FounderVerse = vision, not a build list.** It shows the intended experience (an "operating system for entrepreneurship"). If FounderVerse has an idea the PRD/backend don't support (Idea Vault, AI Coach, Founder Match, Founder Rooms, Business Challenges, AI scores), **mark it FUTURE IDEA / BACKEND GAP — do not build it.**
- Every member doc ends with a **UI/UX checklist to tick before the PR**.

## GAP message (paste in chat when a backend endpoint is missing)
```
GAP
Area:
Route:
What I expected:
What I got:
Temporary screen I built:
```

## Two backend things already known missing — don't build these
- No "view another person's full profile" endpoint → no provider deep-profile, no full profile from search.
- Sending a chat message isn't confirmed → reading chats is fine, check before building "send."
