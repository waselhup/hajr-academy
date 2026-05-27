# HAJR A° Academy — Admin Runbook
## دليل المشرف اليومي

A bilingual cheat-sheet for the operations team. Keep this open in a tab.

---

### Daily / يومي

- Check the **notification bell** in the topbar — anything urgent? / تفقّد جرس التنبيهات.
- Review `/admin/communications/contacts` — new visitor messages / رسائل الزوار الجدد.
- Review `/admin/teachers/payments` — approve any PENDING teacher earnings / اعتمد أرباح المعلمين المعلّقة.
- Check `/admin/live` — any classes happening that need attention? / الحصص الجارية الآن.
- Skim `/calendar` for today's global events (holidays, exams, speaking club).

### Weekly / أسبوعي

- Run `/admin/finance` reports (revenue, outstanding invoices).
- Review `/admin/audit-log` for unusual activity / تدقيق العمليات.
- Send a weekly broadcast: Speaking Club times + announcements.
- Triage `/admin/communications/chats` flagged messages (if any).

### Monthly / شهري

- Parent monthly reports auto-send on the 1st (Sprint 4).
- Review teacher activity dashboard (Sprint 3 — coming).
- Marketer commission reconciliation (Sprint 2 — coming).
- Pay teacher salaries: `/admin/finance` → Salaries tab.
- Update holiday calendar for upcoming month if not already seeded.

### When something breaks

- **Notifications not arriving** → check `/admin/communications` for FAILED messages; verify `RESEND_API_KEY` + `UNIFONIC_APP_SID` in Vercel env.
- **Class reminders missing** → check Vercel Cron logs for `/api/cron/class-reminders` (runs every 5 min).
- **Calendar empty** → re-run `npx tsx prisma/seed-holidays-2026.ts` (idempotent).
- **Payment failures** → Moyasar dashboard → look up by `moyasarPaymentId` on the Invoice row.

### Emergency contacts

- **Vercel**:    https://vercel.com/&lt;team&gt;/hajr-academy
- **Supabase**:  https://supabase.com/dashboard/project/&lt;project-id&gt;
- **Resend**:    https://resend.com/emails
- **Unifonic**:  https://cloud.unifonic.com/dashboard
- **Moyasar**:   https://dashboard.moyasar.com
- **Zoom**:      https://marketplace.zoom.us/develop/apps/&lt;app-id&gt;
- **Tech lead**: &lt;set during handoff&gt;

### Quick links

- Admin command palette: ⌘K / Ctrl+K (or tap "Search" in the mobile bottom nav)
- All-in-one calendar: `/calendar`
- Policies pages: `/policies/payment`, `/policies/refund`, `/policies/privacy`
- WhatsApp FAB number: **TODO — replace placeholder once provided**

### Roles in the platform

| Role | What they see / يرى |
| ---- | --------- |
| `SUPER_ADMIN` | Everything, including system settings + audit log. |
| `ADMIN`       | Everything except audit log + system settings. |
| `TEACHER`     | Their classes, students, assignments, calendar, messages. |
| `STUDENT`     | Their classes, assignments, lab, invoices, calendar, messages. |
| `PARENT`      | Their children's attendance, progress, finance, calendar, messages. |
| `MARKETER`    | Sprint 2 — campaigns, leads, calendar. |
