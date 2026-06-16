# CLAUDE.md — Proper Staffing

Context for Claude Code working on this repository. Read this first before making changes.

## What this is

**Proper Staffing** is an interactive front-end **prototype** of a healthcare gig-staffing app with three roles:
**paraprofessional** (the worker), **facility** (posts shifts), and **admin** (Proper Staffing operations).
It is a clickable demo used to validate the experience and share a link — **not** a production app.

- **Single self-contained file:** the entire app is `index.html` — embedded `<style>`, one big embedded `<script>`, a base64 logo, and a Leaflet map via CDN.
- **No build step, no backend, no framework.** Vanilla JS only.
- **State is in-memory.** Everything resets on page refresh. There is no real auth, database, payments, GPS, or document storage yet.
- **Hosting:** deployed to Vercel as a static site (`index.html` at repo root). Pushing to `main` auto-deploys.

## Files

- `index.html` — the whole application (~6,300 lines). This is the only file that matters for the app.
- `vercel.json` — minimal static-hosting config (no-cache header on the HTML so deploys show immediately).
- `README.md` — deploy instructions (GitHub + Vercel).
- `CLAUDE.md` — this file.

> There may also be a `proper-staffing.min.html` (minified copy) floating around from earlier work. It is optional and renders identically. The source of truth is `index.html`.

## How to work on it

Because it is one file with an embedded script, always validate after edits:

1. **Extract the largest `<script>` block** and run a JS syntax check (e.g. with Node: `node --check`). The big inline script is the app; a syntax error there blanks the whole page.
2. **Check `<div>` balance** — count `<div` vs `</div>`; they must be equal.
3. **Scan for dead buttons** — any `class="btn..."` with no `onclick` is usually a mistake.
4. **Smoke-test the feature you touched** — log in as the relevant role and click through the flow. (Headless Playwright works well if available.)

### Editing gotcha (important)
Modules are defined like `const X = { ... }`. When inserting code immediately after a `/* BOOT */`-style comment or just before a `const Y = {` opener, it is easy to accidentally drop the opener line. **After any insert near a module boundary, re-verify the `const X = {` line is still intact.** This has bitten past edits repeatedly.

## Design conventions

- **Fonts:** DM Sans (UI), DM Mono (numbers/mono).
- **Brand colors** (CSS vars in `:root`): navy `#0B1E3D`, navy-mid `#1E3A6E`, blue `#2563EB`, blue-50 `#DBEAFE`, green `#16A34A`, green-dark `#15803D`, red `#DC2626`, amber `#D97706`, orange `#EA580C`, indigo `#4338CA`. Gray ramp `--g50` (lightest) → `--g900` (darkest).
- **Use the CSS variables**, not hardcoded hex, so light/dark mode keeps working.
- **Buttons are "lively":** gradient + brand-tinted glow + bouncy hover lift + glossy shine sweep + press state. Reuse existing `.btn-primary / -secondary / -success / -danger / -ghost` classes.
- **Light/Dark mode:** toggled via `Theme` module, which sets `data-theme="dark"` on `<html>`. Dark mode overrides the gray ramp + a list of literal-white surface selectors. If you add a new surface with a hardcoded `white`/`#fff` background, also add it to the dark-mode override block (search `[data-theme="dark"]`). Theme persists via `localStorage` (wrapped in try/catch).

## Roles & personas

- Login fixes the role (no cross-role toggle). Top bar = `.role-bar` (fixed navy) with theme toggle, notification bell, status pill, logout. Sidebars: `#sb-para`, `#sb-facility`, `#sb-admin`.
- **Paraprofessional persona:** Maya Rodriguez — active, verified, has ratings + shift history. Seeded as verified so accept/earnings flows work out of the box.
- **Credential scope is paraprofessional-only:** CNA, HHA, PCA, DSP, CMA, BLS (+ ID docs). No LPN/RN/ACLS/OT/PT.
- **Pay model:** W-2, weekly direct deposit only. No cash-out / instant pay anywhere.

## Key JS modules (all inside the one `<script>`; boot order matters)

- **App** — role/page routing (`setRole`, `login`, `logout`, `setPage`, `saveSection`), plus `paraName`, `paraVerified`, and `verifBanner()` (the worker's view-only banner).
- **Theme** — light/dark toggle, persisted in localStorage.
- **ShiftPickup** — the worker's live "Active Shifts" board. `accept(i)` is gated on `App.paraVerified` and, on success, hands off to Earnings (schedule + expected pay), FacilityBilling (charge), ActivityLog, and a facility notification. `addOpening(job)` adds a new live opening.
- **Earnings** — worker pay (current period + history), the period selector, and `renderSchedule()` + `renderCalendar()` which drive the **My Schedule** page (upcoming list, tiles, and the month calendar). The calendar is data-driven from shift data.
- **FacilityJobs** — facility "Manage Jobs." `save()` for a new job calls `_broadcastNewJob()` which pushes the job to the worker's Nearby Jobs + the live board (so pros **and** admins see it), logs it, and notifies both.
- **Favorites** + **FacRate** — facility "favorite" workers and rate them. Favoriting enables a **multi-day invite** (dates + hours per day).
- **ShiftApprovals** — the assignment pipeline: facility invite → **worker accepts** → **admin approves**. Statuses: `pending_worker → pending_admin → approved | declined_*`. On admin approval it applies each day to the worker's schedule/payout + facility billing + logs + notifies. Renders the worker **Shift Invites** page and the admin **Shift Approvals** page.
- **AdminQueue** — admin **Verification Queue** + doc-review. Verification checklist per applicant: Government ID, Credential, **Background check**, **Live Scan** (last two are completed off-app, confirmed via checkbox). **"Activate profile for work"** is disabled until all checks pass. Activating flips the roster record to Active, logs, and notifies. Pending pros are **view-only**.
- **Professionals** — admin roster. Status `active` / `pending` (shown as **"View only"**) / `inactive`. Activation comes from AdminQueue.
- **FacilityBilling** — facility billing total; `add(n)` accrues charges from accepted/approved shifts.
- **NotificationBell** — per-role notification arrays + badges; `push(role, obj)`.
- **ActivityLog** — `add(category, action, target, actor)`; renders on the admin dashboard.
- **Others:** Sites (multi-site facility, org = "Sunny Care Group"), Badges, Modal (`open`/`close`/`toast`), Tooltip, TableSort (click-to-sort on all `.data-table`), WaitlistManager, Payments, Tour (onboarding), Agreements (first-login modal), DM (cross-role messaging).

## Cross-role handshakes (keep these intact)

These flows are wired so an action in one role updates the others. If you touch them, preserve the sequence:

1. **Post a job** (facility) → appears in worker Nearby Jobs + live board + admin Live Shift Management → activity log + notifications.
2. **Accept a shift** (worker) → adds to My Schedule + calendar, updates expected pay, bills the facility, logs it. **Blocked if `App.paraVerified` is false.**
3. **Favorite → multi-day invite → worker accept → admin approve** → applies each day to schedule/payout + facility billing + notifies all parties.
4. **Verification** (admin) → check ID, Credential, Background, Live Scan → Activate → roster goes Active and the worker is no longer view-only.

## Constraints / caveats

- It is a **prototype**: data resets on refresh; treat the deployed URL as "experience the flow," not real transactions.
- `localStorage` is used only for the theme and is try/catch-guarded (it no-ops in sandboxed preview iframes, works on Vercel / a real browser).
- Keep everything in the single `index.html`. Do not introduce a build step, a framework, or split files unless explicitly asked — the zero-config static deploy depends on it.

## Typical request → where to look

- "Add a field/section to the worker profile" → `#para-profile` page markup + relevant module render.
- "Change the schedule/calendar" → `Earnings.renderSchedule()` / `renderCalendar()`.
- "Adjust the verification flow" → `AdminQueue` (checklist, `activate()`) + `App.paraVerified` / `verifBanner()`.
- "New shift/job behavior" → `ShiftPickup` and/or `FacilityJobs._broadcastNewJob()`.
- "Styling / dark mode" → `:root` vars + the `[data-theme="dark"]` block near the end of `<style>`.
