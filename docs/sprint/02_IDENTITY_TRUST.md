# PERSON 2 — IDENTITY + TRUST

Read `00_MASTER_STRATEGY.md` first.
**Your branch:** `frontend/identity-trust`

---

## STEP 1 — Fork the repo (on GitHub website)
1. Open `https://github.com/haricodes2970/TrustNet`
2. Click **Fork** (top right) → choose your account. Now you have `https://github.com/<YOUR_USERNAME>/TrustNet`.

## STEP 2 — Clone YOUR fork + set up (run one by one)
```powershell
cd C:\Users\<YOU>\Downloads
git clone https://github.com/<YOUR_USERNAME>/TrustNet.git
cd TrustNet
git remote add upstream https://github.com/haricodes2970/TrustNet.git
git remote -v
git checkout main
git pull upstream main
git checkout -b frontend/identity-trust
git branch
code .
cd Main\client
npm install
npm run dev
```
Then make `Main\client\.env.local` (two lines from master doc) and restart `npm run dev`. DevAuth is now on.

## STEP 3 — What you build (checklist, in order)
Your pages already exist in `src/pages/auth`, `src/pages/profile`, `src/pages/verification`, `src/pages/onboarding`. You restyle + connect them.

**Before 10:45 (extra job):** post the "logged-in user shape" in chat so others can use it:
```
user = { id, name, email, role, isVerified, avatarUrl }
role = founder | investor | provider | admin
token stored in localStorage key: trustnet_access_token
```
(Check it against real `GET /auth/me` first.)

**9:45–11:00 — layouts:**
- [ ] Restyle Login page
- [ ] Restyle Signup page

**11:20–12:45 — connect real backend (finish these before lunch):**
- [ ] Login → `POST /auth/login`
- [ ] Signup → `POST /auth/register`
- [ ] Load current user → `GET /auth/me`
- [ ] Verification status page → use **LedgerStamp** (Approved / Pending / Under review / Rejected)
- [ ] Profile page → `GET /profile`, Edit Profile → `PUT /profile`

**2:15–3:00 — finish:**
- [ ] Email + OTP verify screens (show wrong/expired OTP error)
- [ ] Onboarding steps
- [ ] Document upload (show progress + file-too-big error)
- [ ] Every page: loading / empty / error / success screen; forms work on phone

**Skip today unless ahead:** Settings, Security, Sessions.

## STEP 4 — After Srujana says "sync now" (~11:00, do it after the break)
```powershell
git add -A
git commit -m "save my work"
git fetch upstream
git rebase upstream/main
npm run dev
```
Conflict in a shared file (colors, App.jsx)? Stop, tell Srujana.

## STEP 5 — Test without waiting
Open `/login`, `/signup`, `/verification`, `/profile` directly. Use DevAuth to pick a role. Use `src/dev/fixtures/user.js` until the real API is connected.

## STEP 6 — Save + submit (3:00)
```powershell
git add -A
git commit -m "feat: identity and verification pages"
git push -u origin frontend/identity-trust
```
Then on GitHub click **Compare & pull request**, make sure the base repo is `haricodes2970/TrustNet` and base branch is `main`, and click **Create pull request**. Tell Srujana.

## Done today =
Login, Signup, verify, Profile, Edit Profile working on real data, all 4 screens, on phone.

## Tomorrow
Test Person 3's area (Startup + Workspace).
