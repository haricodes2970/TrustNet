# PERSON 5 — NETWORK + MARKETPLACE

Read `00_MASTER_STRATEGY.md` first. This is the biggest area, so we cut it down — build only the P0 list.
**Your branch:** `frontend/network-marketplace`

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
git checkout -b frontend/network-marketplace
git branch
code .
cd Main\client
npm install
npm run dev
```
Then make `Main\client\.env.local` (two lines from master doc) and restart `npm run dev`. DevAuth on.

## STEP 3 — What you build (checklist, in order)
Your pages exist in `src/pages/feed`, `marketplace`, `communities`, `notifications`. Restyle + connect. Make new files `src/lib/postApi.js` and `src/lib/searchApi.js`.

**9:45–11:00 — layouts:**
- [ ] Feed page
- [ ] Create Post box

**11:20–12:45 — connect real backend (finish before lunch):**
- [ ] Feed → `GET /posts`
- [ ] Create Post → `POST /posts`
- [ ] Search → `GET /search`
- [ ] Marketplace list → `GET /service-listings`

**2:15–3:00 — finish:**
- [ ] Notifications → `GET /notifications`
- [ ] Service Detail page
- [ ] My Services
- [ ] Engagement Requests → status via **LedgerStamp**
- [ ] Feed + Marketplace stack into single cards on phone
- [ ] Every page: loading / empty / error / success

**Do only if ahead:** Post comments, Communities, reading chat conversations.
**Do NOT build (backend not ready):** Provider deep-profile, "full profile from search", sending chat messages, Recommendations.

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
DevAuth: `founder` for feed, `provider` for services. Open `/feed`, `/search`, `/discover/marketplace`, `/provider/services`, `/engagement-requests` directly. Use `src/dev/fixtures/` files until real API connected.

## STEP 6 — Save + submit (3:00)
```powershell
git add -A
git commit -m "feat: feed, search, marketplace pages"
git push -u origin frontend/network-marketplace
```
On GitHub → **Compare & pull request** → base repo `haricodes2970/TrustNet`, base `main` → **Create pull request**. Tell Srujana.

## Rules
Feed looks professional, not Instagram. Search shows only fields the search returns — don't invent bios/skills. Empty screens suggest a next action.

## Done today =
Feed, Create Post, Search, Notifications, Marketplace, Service Detail, My Services, Engagement Requests — real data, all 4 screens, on phone. Missing-backend items written down, not faked.

## Tomorrow
Test Person 2's area (Identity + Trust). Confirm the chat-send + profile endpoints with the backend owner.
