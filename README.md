# Proper Staffing — Prototype

An interactive, front-end prototype of the Proper Staffing app (paraprofessional, facility, and admin views).
It is a single self-contained `index.html` file — no build step, no backend.

> **Note:** This is a clickable demo. Data lives in the browser and resets on refresh.
> There is no real authentication, payments, GPS, or document storage yet. Use it to
> share and validate the experience, not for real users transacting.

## Files
- `index.html` — the entire app (open this in a browser to run it locally)
- `vercel.json` — minimal hosting config (keeps the HTML from being cached aggressively, so new deploys show up immediately)
- `README.md` — this file

Keep all three files in the **same folder**.

---

## Option A — GitHub + Vercel (auto-deploy on every push)

**1. Create a GitHub repo**
- On github.com → **New repository** → name it (e.g. `proper-staffing`) → create it empty (no README).

**2. Push this folder**
From a terminal inside this folder:
```bash
git init
git add .
git commit -m "Proper Staffing prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/proper-staffing.git
git push -u origin main
```
(No terminal? On the empty repo page use **"uploading an existing file"** and drag these files in.)

**3. Connect Vercel**
- Go to vercel.com → sign in **with GitHub**.
- **Add New… → Project** → **Import** your `proper-staffing` repo.
- Framework Preset: **Other** (plain HTML, no build). Leave build/output settings empty.
- Click **Deploy**.

**4. Done**
- You get a live URL like `proper-staffing.vercel.app` with automatic HTTPS.
- Every future `git push` to `main` auto-deploys; pull requests get preview URLs.

---

## Option B — Vercel only (fastest, no auto-deploy)

- **Drag-and-drop:** In the Vercel dashboard, drag this folder into the deploy area. Live in seconds.
- **CLI:** `npm i -g vercel`, then run `vercel` from this folder and follow the prompts.

Tradeoff: to update, re-drag the folder or re-run `vercel` (no automatic deploys).

---

## Custom domain (optional, later)
Vercel → your Project → **Settings → Domains** → add your domain and follow the DNS instructions.
