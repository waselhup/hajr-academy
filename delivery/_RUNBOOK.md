# HAJR A° Academy — Operations Runbook (v2.0 final)

Bilingual (AR + EN) runbook for the academy admin team. Use this for
every recurring operations task post-handover.

> All paths in this file are relative to the production root, e.g.
> `https://hajr-academy.vercel.app/ar/admin`.

---

## Daily tasks · مهام يومية

### 1. Check `/admin` dashboard tiles
- Pending payment requests, open tickets, low-attendance flags.
- لوحة الإدارة: طلبات الدفع المعلقة، التذاكر المفتوحة، تنبيهات الغياب.

### 2. Triage `/admin/tickets`
- New (auto-tagged) → assign owner → set priority.
- التذاكر الجديدة → إسناد المسؤول → ضبط الأولوية.

### 3. Confirm Zoom webhook health: `/admin/zoom/health`
- Green = receiving events. Red = re-check Vercel logs.

---

## Weekly tasks · مهام أسبوعية

### 1. Review Speaking Club roster
- `/admin/speaking-club` — confirm capacity + reminder timings.

### 2. Approve commissions
- `/admin/marketers/commissions` — flip APPROVED rows to PAID after
  bank transfer, attach `paidReference`.

### 3. Run `/admin/qa/notifications` + `/admin/qa/audit-log`
- Any new "unused" entries = either dead enum or missing instrumentation.

---

## Monthly tasks · مهام شهرية

### 1. Parent reports cron — verify it ran
- `vercel logs` filter `monthly-reports` on the 1st @ 05:00 UTC.
- Failed? `POST /api/admin/parent-reports/[studentId]/regenerate`.

### 2. Issue certificates for completed levels
- `/admin/certificates → New` (auto-fills student + class + level).

### 3. Teacher meeting
- `/admin/teacher-meetings → New` — set agenda, agenda is emailed on
  create + 24h reminder cron fires.

### 4. Database backup
- Supabase → Database → Backups → Create backup now.

---

## Quarterly tasks · مهام ربع سنوية

### 1. Rotate `AUTH_SECRET` and Resend / Anthropic API keys
- Vercel → Settings → Env Vars → Replace → Redeploy.

### 2. Audit `BrandKitAsset` urls
- `/admin/brand-kit` — replace any broken templates.

### 3. Regenerate validation report
- `/admin/validation` → Export Report → send to teachers for re-sign-off.

### 4. v2.x release planning
- Bundle approved teacher requests, ship a small dot release.

---

## Critical workflows · سير العمل الحرج

### Approve a payment request
1. `/admin/payment-requests` → filter `PENDING`.
2. Click row → review breakdown → **Approve**.
3. Pay via bank, then click **Mark as Paid** + paste reference.
4. Notification fires automatically.

### Issue a certificate
1. `/admin/certificates → New`.
2. Pick student + class + level → serial generates automatically.
3. PDF + QR rendered; student notified via in-app + email.

### Generate a parent report manually
1. `/admin/parent-reports → [studentId] → Regenerate`.
2. PDF lands in Supabase `parent-reports` bucket within ~15s.
3. Email goes out via Resend; SMS optional.

### View leads pipeline
1. `/admin/marketers/leads` → status filter (`NEW`, `CONTACTED`, …).
2. Click lead → quick actions: convert, decline, add note.

### Regenerate an AI lesson summary
1. `/admin/recordings` → search session → click **Regenerate**.
2. Per-row: instant. Bulk: select rows → **Generate Bulk** (rate-limited 5/min).

### Pull the brand book
1. `/admin/brand-kit → Download Complete Brand Book`.
2. To email a designer: form at the bottom of the page.

### Pre-meeting validation prep (the teacher meeting)
1. `/admin/validation` → walk through tabs in order during the meeting.
2. Tick **Verified by teacher** + write their name → fills the report.
3. **Export Validation Report** at the top → save the HTML/PDF → send.

---

## Cron schedule reference · جدول cron

| Endpoint | Schedule | Purpose |
| -------- | -------- | ------- |
| `/api/cron/comms-tick` | every 5 min | Outbound message worker (email/SMS). |
| `/api/cron/class-reminders` | every 5 min | 24h + 1h class reminders (students + parents + teacher). |
| `/api/cron/speaking-club-reminders` | every 15 min | 24h + 1h club reminders. |
| `/api/cron/monthly-reports` | 1st @ 05:00 UTC | Parent monthly PDF reports. |

---

## When something breaks

1. **Vercel logs first**: `vercel logs --since 10m`.
2. **Supabase logs**: dashboard → Logs Explorer → filter by table.
3. **Resend logs**: resend.com/emails.
4. **Zoom**: developers.zoom.us → your app → Webhook → Recent deliveries.
5. **Claude / Anthropic**: console.anthropic.com → Usage.

If a fix is non-obvious, raise on the support tier (see README §8).
