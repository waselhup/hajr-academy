# Sprint 1 — Demo Script

Foundation primitives + landing-page trust polish + teacher quick wins.

### Talking points for the client demo

1. **Universal calendar** — open `/calendar` while signed in as a student.
   Saudi holidays are visible immediately (8 events for 2026–2027).
2. **Admin posts a global event** — sign in as admin, click `+ Add Event`,
   tick "Visible to everyone". Sign back in as the student → the event
   pulses on the bell and appears on the calendar. The same notify pipe
   powers every other notification across the platform.
3. **Mobile bottom nav** — open the site on a phone (or 375px in DevTools).
   Every authenticated page now has a 4-tab nav: Home / Calendar /
   Messages / Profile. Unread bell badge lives on Messages.
4. **Trust signals on the landing page**:
     - Announcement bar at the top, dismissable.
     - Sign-in + "Enroll free" CTAs **always** visible at every breakpoint.
     - 6 testimonials with star ratings + avatar gradients (verified badge).
     - Floating WhatsApp button bottom-right.
5. **Policies pages** — `/policies/payment`, `/refund`, `/privacy`.
   Bilingual, linked from the footer.
6. **Date format fix** — the teacher's "22 مايو 2023 م" issue is gone.
   New `fmtDateLong()` helper renders "22 مايو 2026" / "May 22, 2026".
7. **Class reminders cron** — `/api/cron/class-reminders` runs every 5 min,
   sending 24h-ahead in-app + email reminders and 1h-ahead in-app + SMS.
8. **MARKETER role scaffold** — added to the DB enum + RBAC + sidebar
   wiring, but no UI yet. Sprint 2 builds the marketer dashboard,
   campaigns table, lead pipeline, and commission ledger.

### Files added / changed

- `prisma/schema.prisma` — `CalendarEvent` model + `CalendarEventType` enum +
  `MARKETER` value on `Role` enum + 5 inverse relations.
- `prisma/migrations-sprint1.sql` + `apply-sprint1.ts` — idempotent applier.
- `prisma/seed-holidays-2026.ts` — 8 Saudi holidays.
- `src/lib/notify.ts` — universal pipe (inApp / email / sms / realtime).
- `src/lib/calendar.ts` — visibility-aware helpers.
- `src/lib/audit.ts` — wrapper with `audit.mutation()`; `audit-base.ts` keeps `logAudit`.
- `src/lib/format.ts` — new `fmtDateLong()`.
- `src/app/api/calendar/events/{,[id]}/route.ts` — CRUD with audit.
- `src/app/api/cron/class-reminders/route.ts` — 24h + 1h reminders.
- `src/components/calendar/UniversalCalendar.tsx` — month / week / day / agenda.
- `src/components/shell/mobile-bottom-nav.tsx` — role-aware bottom nav.
- `src/components/public/AnnouncementBar.tsx`, `WhatsAppFab.tsx`, `MobileStickyCta.tsx`.
- `src/components/class/time-until-chip.tsx` — countdown chip.
- `src/app/[locale]/(public)/policies/{payment,refund,privacy}/page.tsx`.
- `src/app/[locale]/(app)/calendar/page.tsx`.
- `vercel.json` — added `/api/cron/class-reminders` schedule.
- `src/messages/{ar,en}.json` — 50 new keys, exact parity.
- `delivery/{README,_RUNBOOK,sprints/sprint-01}.md`.

### Next: Sprint 2 — Marketers + Placement Test

- Marketer dashboard (campaigns, leads, commission)
- Public placement-test landing + free assessment flow
- Auto-handoff from placement test → trial request → enrollment funnel
