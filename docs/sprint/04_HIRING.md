# PERSON 4 — HIRING

Read `00_MASTER_STRATEGY.md` first.
**Your branch:** `frontend/hiring`

⚠️ Your pages **don't exist yet** — you build them new. Keep it lean and **reuse Srujana's components** (Button, Input, Badge, Table, LedgerStamp). Don't build your own.

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
git checkout -b frontend/hiring
git branch
code .
cd Main\client
npm install
npm run dev
```
Then make `Main\client\.env.local` (two lines from master doc) and restart `npm run dev`. DevAuth on.

## STEP 3 — What you build (checklist, in order)
Make a new folder `src/pages/hiring` and a new file `src/lib/jobApi.js`.

**9:45–11:00 — layouts:**
- [ ] Job Discovery list (cards)
- [ ] Job Detail page
- [ ] Start `src/lib/jobApi.js`

**11:20–12:45 — connect real backend (finish before lunch):**
- [ ] Jobs list → `GET /jobs`
- [ ] Job detail → `GET /jobs/:id`
- [ ] Apply to a job → `POST /applications` (browsing is public; applying needs login)

⚠️ At the 12:45 checkpoint, if jobs aren't showing yet, **say so** — you lose 75 min to lunch right after.

**2:15–3:00 — finish:**
- [ ] My Applications → `GET /applications`
- [ ] Application Detail → status via **LedgerStamp**
- [ ] Job list stacks into single cards on phone
- [ ] Every page: loading / empty / error / success

**Do only if ahead:** Create Job, Manage Jobs, Job Applicants.
**Do NOT touch:** Funding (that's tomorrow).

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
DevAuth: guest = browsing, `founder` = employer. Open `/jobs`, `/jobs/<id>`, `/applications` directly. Use `src/dev/fixtures/jobs.js` until real API connected.

## STEP 6 — Save + submit (3:00)
```powershell
git add -A
git commit -m "feat: hiring - jobs and applications"
git push -u origin frontend/hiring
```
On GitHub → **Compare & pull request** → base repo `haricodes2970/TrustNet`, base `main` → **Create pull request**. Tell Srujana.

## If behind
Ship just: browse jobs + apply + see my applications. Skip everything employer-side.

## Done today =
Job list, Job Detail, apply, My Applications — real data, all 4 screens, on phone.

## Tomorrow
Test Person 5's area (Network + Marketplace). You also build Funding tomorrow.
