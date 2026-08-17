# DESIGN RULES — follow these exactly (from the PRD §12, §13, §19, §20)

Everyone builds to this. Srujana sets the tokens by ~11:00; you use them, you don't invent your own colors, fonts, or shadows.

---

## 1. Colors — only these 6 (nothing else)
| Name | Hex | Use it for |
|---|---|---|
| ink | `#0E1A2B` | Text, headings, dark surfaces |
| paper | `#F7F5EF` | Page background (warm bone — NOT white) |
| verified | `#0F6E5C` | Approved / positive state **and** the primary action/button |
| signal | `#C8862B` | Pending / in-progress / attention **and** secondary accent |
| alert | `#B23A32` | Rejected / error / destructive |
| slate | `#5B6472` | Secondary text, borders, dividers |

## 2. BANNED (the PRD names these as overused AI defaults — do not use)
- ❌ Gradients as a background/surface
- ❌ Glassmorphism / backdrop blur
- ❌ All-dark theme with one neon accent
- ❌ Pure white `#FFFFFF` backgrounds (use paper instead)
- ❌ Multi-layer / stacked shadows

## 3. Fonts — 3 roles, don't mix them up
- **Fraunces** (serif) → headings + the Ledger Stamp label. **Headings only, never body text.**
- **IBM Plex Sans** → all body text, UI labels, form fields.
- **IBM Plex Mono** → data: IDs, amounts, timestamps, table numbers, the Ledger Stamp's state text + date.

**Type sizes:** 12 / 14 / 16 / 18 / 24 / 32 / 48 px. Fraunces is used **only at 24px and up**.

## 4. Spacing, corners, shadow
- **Spacing:** multiples of 8 → 8 / 16 / 24 / 32 / 48 / 64.
- **Rounded corners:** inputs & badges = **4px**, cards = **8px**, Ledger Stamp = **0px** (a stamp is not rounded).
- **Shadow:** exactly ONE, on cards/modals/dropdowns: `0 2px 8px rgba(14,26,43,0.08)`. No other shadows.

## 5. The Ledger Stamp — the ONE signature element (build once, use everywhere)
Every status in the app (KYC, job, application, funding round, funding contribution, investment interest, engagement request, service listing) uses **the same LedgerStamp component** — not a different badge per page.

Looks like a small certificate/official seal:
- Fraunces label + IBM Plex Mono state name **and a timestamp** (status is always **shown, named, AND dated**)
- A thin **double-rule border** (like a document seal)

| Status | Style |
|---|---|
| APPROVED | solid — ink text on verified-teal |
| PENDING / UNDER_REVIEW | outlined amber (signal) |
| REJECTED | outlined rose (alert) |

**Rule:** status is never shown by color alone — always with text.

## 6. UX rules (§13) — how pages behave
- **Empty screens tell the user what to do:** "No startups yet — create your first one" + a button. Not "Nothing to show."
- **Errors are specific, in a human voice:** use the backend's real message, e.g. "This funding round is closed and can no longer accept contributions." Not "Something went wrong."
- **Never show a button the backend will reject.** If a user's role can't do something, don't render the control (don't show it then 403).
- **One action, one name, all the way through:** button "Publish job" → toast "Job published."

## 7. Responsive rules (§19) — what changes on smaller screens
- **Navigation:** desktop = full sidebar + top bar. Mobile = slide-over drawer + a **bottom bar with 5 items: Dashboard, Feed, Search, Messages, Profile.**
- **Tables** (applications, team, admin): mobile = turn into a **stacked card list**, NOT a shrunk table.
- **Cards** (startup, service, job): 3 per row → 2 → 1 on mobile.
- **Forms:** mobile = single column with a **sticky Save/Continue bar at the bottom.**
- **Kanban / task board:** mobile = single-column list grouped by status, NOT a squeezed Kanban.
- **Dashboard:** 3-column → 2-column → single column (verification status shown first).

## 8. Accessibility — non-negotiable (§20), not optional polish
- Everything works with the keyboard. Modal/Drawer trap focus + close on Esc.
- Visible focus outline on every clickable/focusable thing.
- Text contrast at least 4.5:1.
- Every input has a real `<label>` (a placeholder is not a label).
- Error text linked to its field with `aria-describedby`.
- Modals use `role="dialog"` + `aria-modal` + a title.
- Status needs a text label for screen readers, e.g. `aria-label="Verification status: approved"` — not color alone.
- Respect `prefers-reduced-motion` (turn off the old AnimatedBackground under it).

## 9. No data you can't back up (§16)
- No fake numbers. Landing-page stats are either clearly static marketing text or counted from a real API response — never invented.
- Don't build a full profile from a search result (no profile-by-ID endpoint exists).

---

**Quick self-check before you open your PR:** paper background (not white), 6 colors only, Fraunces headings / Plex Sans body / Plex Mono numbers, 8px spacing, 4/8/0 corners, one soft shadow, LedgerStamp for every status (with a date), no glass/gradient, works on phone, has all 4 screens (loading/empty/error/success).
