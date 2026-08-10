# PERSON 3 — STARTUP + WORKSPACE

Read `00_MASTER_STRATEGY.md` first.
**Your branch:** `frontend/startup-workspace`

---

## STEP 1 — Fork the repo (on GitHub website)
1. Open `https://github.com/haricodes2970/TrustNet`
2. Click **Fork** → your account. You now have `https://github.com/<YOUR_USERNAME>/TrustNet`.

## STEP 2 — Clone YOUR fork + set up (run one by one)
```powershell
cd C:\Users\<YOU>\Downloads
git clone https://github.com/<YOUR_USERNAME>/TrustNet.git
cd TrustNet
git remote add upstream https://github.com/haricodes2970/TrustNet.git
git remote -v
git checkout main
git pull upstream main
git checkout -b frontend/startup-workspace
git branch
code .
cd Main\client
npm install
npm run dev
```
Then make `Main\client\.env.local` (two lines from master doc) and restart `npm run dev`. DevAuth on.

## STEP 3 — What you build (checklist, in order)
Your pages exist in `src/pages/startups` and `src/pages/workspace`. Restyle + connect.

**9:45–11:00 — layouts:**
- [ ] Restyle My Startups list
- [ ] Build the Create Startup form (fields: name, slug, description, category)

**11:20–12:45 — connect real backend (finish before lunch):**
- [ ] My Startups → `GET /startups/me`
- [ ] Create Startup → `POST /startups` (show the real "slug already taken" 409 error)
- [ ] Startup Detail → `GET /startups/:id`

**2:15–3:00 — finish:**
- [ ] Team list (members come from the real team, not made up)
- [ ] Workspace overview (show real "workspace already exists" error)
- [ ] Use **LedgerStamp** for anything with a status
- [ ] Every page: loading / empty / error / success; tables scroll on phone

**Do only if ahead:** Projects, Tasks, breadcrumbs.
**Skip if behind:** Milestones, Documents.

## STEP 4 — After Srujana says "sync now" (~11:00, after the break)
```powershell
git add -A
git commit -m "save my work"
git fetch upstream
git rebase upstream/main
npm run dev
```
Conflict in a shared file? Stop, tell Srujana.

## STEP 5 — Test without waiting
DevAuth role = `founder`. Open `/app/startups`, `/app/startups/create`, `/app/startups/<id>` directly. Use `src/dev/fixtures/startup.js` until real API connected.

## STEP 6 — Save + submit (3:00)
```powershell
git add -A
git commit -m "feat: startup and workspace pages"
git push -u origin frontend/startup-workspace
```
On GitHub → **Compare & pull request** → base repo `haricodes2970/TrustNet`, base `main` → **Create pull request**. Tell Srujana.

## Done today =
My Startups, Create Startup (with real errors), Startup Detail, Team, Workspace — real data, all 4 screens, on phone.

## Tomorrow
Test Person 4's area (Hiring).
