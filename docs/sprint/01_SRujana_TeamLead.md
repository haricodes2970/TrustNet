# PERSON 1 — SRUJANA (Team Lead)

Read `00_MASTER_STRATEGY.md` first. You own the main repo and merge everyone. You do NOT build every page.

You clone the **original repo directly** (not a fork) because you're the one who merges everyone's Pull Requests.

---

## STEP 1 — Setup (run these commands, one by one)
```powershell
cd C:\Users\Srujana\Downloads
git clone https://github.com/haricodes2970/TrustNet.git
cd TrustNet
git remote -v
git checkout main
git pull origin main
git checkout -b frontend/design-foundations
git branch
code .
cd Main\client
npm install
npm run dev
```
Then make `Main\client\.env.local` (two lines from master doc) and restart `npm run dev`.

## STEP 2 — Before the team starts (on GitHub website)
- Repo → **Settings → Collaborators** → add P2–P5 (so their PRs can be merged fast).
- Repo → **Settings → Branches** → protect `main` (require a Pull Request; no direct pushes).
- Tell the team: *"Repo ready. Fork it and start. Don't wait for me. Colors land ~11:00."*

## STEP 3 — What you build (in order)

**9:45–11:00 — the shared basics (do ONLY this — it unblocks everyone):**
- [ ] Set PRD colors + fonts in `tailwind.config.js` and `src/styles/globals.css`. Delete old emerald colors + glass effects.
- [ ] Restyle: Button, Input, Badge, Skeleton, EmptyState, ErrorState (in `src/components/ui/`).
- [ ] Build **LedgerStamp** (status component).
- [ ] Split routes: make `src/routes/` with one file per person (`authRoutes.jsx`, `startupRoutes.jsx`, `hiringRoutes.jsx`, `networkRoutes.jsx`, `publicRoutes.jsx`, `adminRoutes.jsx`). `App.jsx` just imports them.
- [ ] Build **DevAuthProvider** in `src/dev/`.
- [ ] **Push + merge to `main` by ~11:00.** Tell everyone: *"Sync now."*

**11:00–11:20 — ☕ Break**

**11:20–12:45 — the page shell:**
- [ ] PublicLayout, AuthLayout, AppLayout.
- [ ] Top navigation + mobile navigation.
- [ ] Remove `mockData` from `src/context/AppContext.jsx`.

**12:45–1:00 — Checkpoint.** Ask each person: what's done, what's stuck. **Decide cuts now** (everyone leaves for lunch next).

**1:00–2:15 — 🍽 Lunch**

**2:15–3:00 — Dashboard:**
- [ ] Build Dashboard using real `GET /dashboard` data. Real numbers, clear empty state.
- [ ] Make the shell work on mobile.
- [ ] If short on time, ship a plain summary and skip the rest.

## STEP 4 — Save your work (commit + push)
```powershell
cd C:\Users\Srujana\Downloads\TrustNet
git add -A
git commit -m "feat: design foundations, shell, dashboard"
git push -u origin frontend/design-foundations
```
Then open a PR on GitHub and merge it (you're the lead).

## STEP 5 — 3:00–3:45 Merge everyone's PRs (in order: P2 → P3 → P4 → P5)
For each person's PR on GitHub: open it, click **Merge**. After each merge, on your machine:
```powershell
git checkout main
git pull origin main
npm run build
```
`npm run build` must pass before you merge the next person. If a PR breaks the build, skip it — that work becomes tomorrow's.

## STEP 6 — 3:45–4:30 Final
- [ ] Smoke test: signup → verify → dashboard → create startup → feed loads.
- [ ] `npm run build` passes, no red errors.
- [ ] Do NOT deploy today — that's tomorrow.

---

## Done today =
Colors/fonts live, everyone merged into one build, `npm run build` passes, main flow works.

## Tomorrow
Run the final full test + deploy. Test Person 2's area.
