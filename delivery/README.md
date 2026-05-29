# HAJR A° Academy — Platform v2.0 Final Delivery

> Seven sprints. One platform. Zero excuses.
>
> This folder is the canonical handover. Everything the owner needs to
> operate, demo, hand off, and renew the platform lives here or is one
> click away from `/admin/delivery`.

---

## 1 · What was delivered (7 sprints summary)

| Sprint | Theme | Key shippables |
| ------ | ----- | -------------- |
| **1** | Foundations + Trust UX | Auth + RBAC for 6 roles, unified `CalendarEvent`, `notify()` primitive, `audit.mutation()` primitive, cron infrastructure, mobile bottom nav, policies pages, MARKETER scaffold. |
| **2** | Marketers + Placement | Marketer role + referral codes, leads pipeline, commission engine (15% default), payouts, placement test with CEFR mapping, lead landing `/apply?ref=`. |
| **3** | Support + Identity | Tickets with SLA + Claude triage, public teacher profiles `/teachers/[slug]`, monthly teacher meetings + RSVP, teacher readiness check. |
| **4** | Reports + Money | Monthly parent PDF reports (Supabase storage + WhatsApp share image), QR-verifiable certificates, self-service payment requests for teachers + marketers, Speaking Club end-to-end. |
| **5** | AI + Brand + Handover | Auto AI lesson summaries (Claude Haiku), Brand Book PDF + asset library, Teacher Validation Mode (12-tab meeting tool), auto-generated client presentation (PPTX + PDF), QA sweep tools, this handover package. |
| **6** | Manuals + IA Cleanup | 6 bilingual user manuals (admin/teacher/student × AR/EN), full information-architecture rebuild → 100% nav coverage (no orphaned pages), PlaceholderPage stubs eliminated. |
| **7** | Library + Tech Check + Analytics + Ratings + Gamification | Content library (Supabase `library-content` bucket), mandatory pre-class tech check, PDPL-safe activity analytics, 3-tier rating system, 4-age-tier gamification (XP engine). |

Full per-feature status: `FEATURE-MATRIX.csv` and live at
`/admin/delivery → Feature matrix`.

### Platform scale (verified 2026-05-29)

| Metric | Count |
| ------ | ----- |
| Prisma models | 72 |
| Build routes (pages + API) | 259 (production build green, 0 errors) |
| i18n keys (AR = EN parity) | 2218 = 2218 ✅ |
| Nav coverage | 100% (no orphaned pages) |

---

## 2 · URLs

| Environment | URL |
| ----------- | --- |
| Production  | https://hajr-academy.vercel.app (or your custom domain — see DNS) |
| Local dev   | `npm run dev` → http://localhost:3000 |

Admin entry: `/{locale}/admin` (locale = `ar` or `en`).

---

## 3 · Admin credentials reset

1. Go to Supabase → SQL editor.
2. Pick the admin user: `SELECT id, email FROM "User" WHERE role IN ('ADMIN','SUPER_ADMIN');`
3. Generate a fresh bcrypt hash locally:
   ```
   node -e "console.log(require('bcryptjs').hashSync('NEW_PASSWORD',10))"
   ```
4. Apply: `UPDATE "User" SET "passwordHash" = '$2a$10$...' WHERE email = 'you@example.com';`
5. Rotate **all** of: `AUTH_SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`,
   `ZOOM_CLIENT_SECRET`, `CRON_SECRET` in Vercel → Settings → Environment Variables.
6. Redeploy.

---

## 4 · Database backup

Supabase handles automated daily backups on every paid plan. To take a
manual snapshot before a risky change:

- Supabase dashboard → **Database → Backups → Create backup now**.
- Or via CLI: `supabase db dump --data-only -f backup.sql`.

Restore: dashboard → **Database → Backups → Restore** (point-in-time
recovery is available on Pro plan).

---

## 5 · Vercel renewal & redeploy

- Renew: Vercel auto-renews unless the card is removed. Verify under
  **Account → Billing** monthly.
- Redeploy: `git push main` triggers a build via the connected GitHub
  repo. Manual rebuild: Vercel → **Deployments → Redeploy**.
- Custom domain DNS: Vercel → **Settings → Domains** for the auto-cert
  refresh status.

---

## 6 · How to add new users

### New teacher
1. `/admin/users → New user → role TEACHER`.
2. After creation, open the created user, scroll to **TeacherProfile** and
   fill in subjects + readiness data.
3. Send them the login link; they finish their profile from `/teacher/profile`.

### New student
1. Easiest path: send them `/apply` — public signup with placement test.
2. Manual: `/admin/users → role STUDENT`, then link to a parent if needed.

### New marketer
1. `/marketer/apply` (public) creates a MarketerProfile in `PENDING`.
2. `/admin/marketers` → approve → referral code is generated automatically.

---

## 7 · Emergency contacts

| Service | URL | Notes |
| ------- | --- | ----- |
| Vercel  | https://vercel.com/support | Deployment + DNS. |
| Supabase | https://supabase.com/support | Database + storage. |
| Resend  | https://resend.com/support | Email delivery. |
| Zoom    | https://developers.zoom.us | API + webhooks. |
| Anthropic | https://support.anthropic.com | Claude API (AI summaries + triage). |

---

## 8 · Support tier (post-delivery)

- **Critical bugs**: fixed free of charge, response within 24h.
- **Minor bugs / questions**: best-effort, response within 5 working days.
- **New features**: quarterly v2.1 / v2.2 / v2.3 releases — 20% revenue
  share covers ongoing maintenance. Outside-scope features quoted
  separately.

---

## 9 · Owner responsibilities

- Keep credit cards funded on Vercel, Supabase, Resend, Zoom, Anthropic.
- Forward any client teacher feedback into `/admin/validation` for the
  next sprint planning.
- Run a manual database backup before any "big" change (term start,
  exam season, etc).
- Review `/admin/qa/notifications` and `/admin/qa/audit-log` monthly to
  catch regressions early.

---

## 10 · Feature completion matrix

See `FEATURE-MATRIX.csv` (downloadable live at
`/api/admin/delivery/feature-matrix`).

---

## 11 · Handover checklist

See `HANDOVER-CHECKLIST.md`. Owner ticks each box, signs the partnership
agreement, and the 20% rev-share kicks in.

---

## 12 · User Manuals

Three role-based manuals, each in Arabic and English (6 deliverables total):

| Role | English | Arabic |
| ---- | ------- | ------ |
| Admin | `/api/admin/manuals/admin?lang=en` | `/api/admin/manuals/admin?lang=ar` |
| Teacher | `/api/admin/manuals/teacher?lang=en` | `/api/admin/manuals/teacher?lang=ar` |
| Student | `/api/admin/manuals/student?lang=en` | `/api/admin/manuals/student?lang=ar` |

ZIP bundle of all six: `/api/admin/manuals/all`

UI hub: `/admin/manuals` (lists every download in a single grid + ZIP).

Each manual is a self-contained HTML document optimized for "Save as PDF"
from any modern browser. Missing screenshots render as placeholder frames
so the document never breaks. To refresh screenshots, run:

```
npx tsx scripts/capture-manual-screenshots.ts
```

while the dev server is running on `http://localhost:3000`.

---

## 13 · Navigation

A full audit of the role-scoped information architecture lives at
[`NAVIGATION-AUDIT.md`](NAVIGATION-AUDIT.md).

Highlights of the 2026-05-28 IA rebuild (extended through Sprint 7):

- All page routes now reachable through the sidebar, mobile nav, or
  dashboard "Explore the platform" cards — **100% coverage** (was ~34%).
- Admin nav: 7 collapsible groups (People · Academics · Content · Finance ·
  Comms · Operations · System).
- Teacher / Student / Parent dashboards each gained role-scoped grouped
  sidebars (Teaching · Personal, Learning · Achievements · Account,
  Children · Reports · Billing).
- Mobile bottom-nav grew from 4 → 5 slots per role so the most-used
  feature surfaces alongside Messages/Calendar.
- All keys exist in both `ar.json` and `en.json` — **2218 each** (full parity).

To re-verify coverage after future nav changes:

```
node scripts/nav-coverage.cjs
```

---

## 14 · Post-handover maintenance mode

The platform is feature-complete for v2.0. After handover it runs in
**maintenance mode** — no new features until the quarterly v2.1 release.

**What's next**
- **v2.1 (quarterly):** bundle approved teacher/owner requests into a small
  dot release. Track incoming requests in `/admin/validation`.
- **Operations:** follow [`_RUNBOOK.md`](_RUNBOOK.md) for daily / weekly /
  monthly / quarterly tasks.
- **Open items:** see [`../BLOCKERS.md`](../BLOCKERS.md). As of 2026-05-29 the
  critical RLS-exposure issue is **resolved**; the only open follow-up is
  rotating the DB Postgres password (committed in git history).

**Latest pre-launch QA**
- A full 6-role walkthrough was run on 2026-05-29 — findings in
  [`PRELAUNCH-WALKTHROUGH-2026-05-29.md`](PRELAUNCH-WALKTHROUGH-2026-05-29.md).
  Result: production build green (259/259 routes), i18n parity intact, money
  pages clean. Three minor bugs found and fixed (MARKETER login redirect,
  two missing i18n keys, admin form labels). Remaining items are cosmetic
  polish, safe to batch into v2.1.
- Known cosmetic warning: set `metadataBase` in the root metadata export to
  the production URL to get correct social-share (OG/Twitter) image URLs.

---

— Hajr A° v2.0 · Built with care.
