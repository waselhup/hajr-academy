# HAJR A° Academy — Platform v2.0 Final Delivery

> Five sprints. One platform. Zero excuses.
>
> This folder is the canonical handover. Everything the owner needs to
> operate, demo, hand off, and renew the platform lives here or is one
> click away from `/admin/delivery`.

---

## 1 · What was delivered (5 sprints summary)

| Sprint | Theme | Key shippables |
| ------ | ----- | -------------- |
| **1** | Foundations + Trust UX | Auth + RBAC for 6 roles, unified `CalendarEvent`, `notify()` primitive, `audit.mutation()` primitive, cron infrastructure, mobile bottom nav, policies pages, MARKETER scaffold. |
| **2** | Marketers + Placement | Marketer role + referral codes, leads pipeline, commission engine (15% default), payouts, placement test with CEFR mapping, lead landing `/apply?ref=`. |
| **3** | Support + Identity | Tickets with SLA + Claude triage, public teacher profiles `/teachers/[slug]`, monthly teacher meetings + RSVP, teacher readiness check. |
| **4** | Reports + Money | Monthly parent PDF reports (Supabase storage + WhatsApp share image), QR-verifiable certificates, self-service payment requests for teachers + marketers, Speaking Club end-to-end. |
| **5** | AI + Brand + Handover | Auto AI lesson summaries (Claude Haiku), Brand Book PDF + asset library, Teacher Validation Mode (12-tab meeting tool), auto-generated client presentation (PPTX + PDF), QA sweep tools, this handover package. |

Full per-feature status: `FEATURE-MATRIX.csv` and live at
`/admin/delivery → Feature matrix`.

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

— Hajr A° v2.0 · Built with care.
