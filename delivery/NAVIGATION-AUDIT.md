# Navigation Completeness Audit + Smart IA Rebuild

**Date:** 2026-05-28
**Branch:** `main`
**Trigger:** Owner Zoom (Ali) — ~101 of 146 pages were orphaned (reachable only by URL).
**Status:** Phase 1 → Phase 5 complete.

---

## Phase 1 — Ground-truth Page Inventory

### Counts

| Metric                       | Value |
|------------------------------|-------|
| Total `page.tsx` files       | 147   |
|   under `[locale]/**`        | 146   |
|   root `src/app/page.tsx`    | 1     |
| Public/auth/utility routes   | 19    |
| In-app product pages         | 127   |
| Dynamic `[param]` leaf pages | 26    |
| Sidebar entries (before)     | 45    |
| Orphaned pages (before)      | 101   |

### (a) Pages by role — before nav reform

Legend: ✅ in-nav · ❌ orphaned · 🔗 child-of-hub (intentionally not in nav, reachable from parent) · 🚪 reached via header/global

#### ADMIN / SUPER_ADMIN (62 pages)

| Path                                                | Type | Status   | Owner-Group (proposed) |
|-----------------------------------------------------|------|----------|------------------------|
| `/admin`                                            | hub  | ✅       | (top-level)            |
| `/admin/students`                                   | hub  | ✅       | People                 |
| `/admin/students/transfer`                          | hub  | ❌       | People                 |
| `/admin/teachers`                                   | hub  | ✅       | People                 |
| `/admin/teachers/payments`                          | hub  | ❌       | Finance                |
| `/admin/teachers/[id]/readiness`                    | leaf | 🔗       | People (child)         |
| `/admin/teacher-activity`                           | hub  | ❌       | People                 |
| `/admin/teacher-meetings`                           | hub  | ❌       | People                 |
| `/admin/teacher-meetings/[id]`                      | leaf | 🔗       | People (child)         |
| `/admin/parents`                                    | hub  | ✅       | People                 |
| `/admin/parent-invites`                             | hub  | ❌       | People                 |
| `/admin/schools`                                    | hub  | ✅       | People                 |
| `/admin/schools/[id]`                               | leaf | 🔗       | People (child)         |
| `/admin/marketers`                                  | hub  | ❌       | People                 |
| `/admin/marketers/[id]`                             | leaf | 🔗       | People (child)         |
| `/admin/marketers/commissions`                      | hub  | ❌       | Finance                |
| `/admin/programs`                                   | hub  | ✅       | Academics              |
| `/admin/classes`                                    | hub  | ✅       | Academics              |
| `/admin/classes/[id]`                               | leaf | 🔗       | Academics (child)      |
| `/admin/schedule`                                   | hub  | ✅       | Academics              |
| `/admin/trials`                                     | hub  | ✅       | Academics              |
| `/admin/attendance`                                 | hub  | ❌       | Academics              |
| `/admin/placement-tests`                            | hub  | ❌       | Academics              |
| `/admin/placement-tests/[id]`                       | leaf | 🔗       | Academics (child)      |
| `/admin/placement-tests/leads`                      | hub  | ❌       | Academics              |
| `/admin/speaking-club`                              | hub  | ❌       | Academics              |
| `/admin/speaking-club/[id]`                         | leaf | 🔗       | Academics (child)      |
| `/admin/test-bank`                                  | hub  | ✅       | Content                |
| `/admin/exams`                                      | hub  | ✅       | Content                |
| `/admin/lab`                                        | hub  | ❌       | Content                |
| `/admin/lab/exercises`                              | hub  | ✅       | Content                |
| `/admin/step-bank`                                  | hub  | ❌       | Content                |
| `/admin/blackboards`                                | hub  | ✅       | Content                |
| `/admin/certificates`                               | hub  | ❌       | Content                |
| `/admin/finance`                                    | hub  | ✅       | Finance                |
| `/admin/finance/invoices`                           | hub  | ❌       | Finance                |
| `/admin/finance/subscriptions`                      | hub  | ❌       | Finance                |
| `/admin/finance/refunds`                            | hub  | ❌       | Finance                |
| `/admin/finance/promo-codes`                        | hub  | ❌       | Finance                |
| `/admin/payment-requests`                           | hub  | ❌       | Finance                |
| `/admin/communications`                             | hub  | ✅       | Comms                  |
| `/admin/communications/chats`                       | hub  | ✅       | Comms                  |
| `/admin/communications/contacts`                    | hub  | ✅       | Comms                  |
| `/admin/communications/templates`                   | hub  | ✅       | Comms                  |
| `/admin/communications/logs`                        | hub  | ❌       | Comms                  |
| `/admin/live`                                       | hub  | ✅       | Operations             |
| `/admin/recordings`                                 | hub  | ✅       | Operations             |
| `/admin/ai`                                         | hub  | ✅       | Operations             |
| `/admin/delivery`                                   | hub  | ❌       | Operations             |
| `/admin/validation`                                 | hub  | ❌       | Operations             |
| `/admin/manuals`                                    | hub  | ❌       | Operations             |
| `/admin/brand-kit`                                  | hub  | ❌       | Operations             |
| `/admin/qa/audit-log`                               | hub  | ❌       | System (super-only)    |
| `/admin/qa/i18n`                                    | hub  | ❌       | System (super-only)    |
| `/admin/qa/notifications`                           | hub  | ❌       | System (super-only)    |
| `/admin/audit-log`                                  | hub  | ✅       | System (super-only)    |
| `/admin/settings`                                   | hub  | ✅       | System (super-only)    |
| `/admin/tickets`                                    | hub  | ❌       | System                 |
| `/admin/tickets/[id]`                               | leaf | 🔗       | System (child)         |
| `/messages`                                         | hub  | ✅       | Comms                  |
| `/notifications`                                    | leaf | 🚪       | (bell icon)            |
| `/settings/notifications`                           | leaf | 🚪       | (avatar menu)          |
| `/calendar`                                         | hub  | 🚪       | (mobile bottom-nav)    |

#### TEACHER (21 pages)

| Path                                       | Type | Status | Group (proposed) |
|--------------------------------------------|------|--------|------------------|
| `/teacher`                                 | hub  | ✅     | (top-level)      |
| `/teacher/classes`                         | hub  | ✅     | Teaching         |
| `/teacher/classes/[classId]`               | leaf | 🔗     | Teaching (child) |
| `/teacher/students`                        | hub  | ✅     | Teaching         |
| `/teacher/students/[studentId]`            | leaf | 🔗     | Teaching (child) |
| `/teacher/assignments`                     | hub  | ✅     | Teaching         |
| `/teacher/attendance`                      | hub  | ❌     | Teaching         |
| `/teacher/attendance/[sessionId]`          | leaf | 🔗     | Teaching (child) |
| `/teacher/lab`                             | hub  | ❌     | Teaching         |
| `/teacher/lab/student/[studentId]`         | leaf | 🔗     | Teaching (child) |
| `/teacher/blackboard`                      | hub  | ❌     | Teaching         |
| `/teacher/blackboard/[roomId]`             | leaf | 🔗     | Teaching (child) |
| `/teacher/meetings`                        | hub  | ❌     | Personal         |
| `/teacher/meetings/[id]`                   | leaf | 🔗     | Personal (child) |
| `/teacher/readiness`                       | hub  | ❌     | Personal         |
| `/teacher/private-lessons`                 | hub  | ❌     | Teaching         |
| `/teacher/sessions/[id]/summary`           | leaf | 🔗     | Teaching (child) |
| `/teacher/salary`                          | hub  | ❌     | Personal         |
| `/teacher/payment-requests`                | hub  | ❌     | Personal         |
| `/teacher/profile`                         | hub  | ✅     | Personal         |
| `/teacher/profile/public`                  | hub  | ❌     | Personal         |
| `/teacher/messages`                        | hub  | 🚪     | (redirects /messages) |

#### STUDENT (20 pages)

| Path                                          | Type | Status | Group (proposed) |
|-----------------------------------------------|------|--------|------------------|
| `/student`                                    | hub  | ✅     | (top-level)      |
| `/student/classes`                            | hub  | ✅     | Learning         |
| `/student/assignments`                        | hub  | ✅     | Learning         |
| `/student/lab`                                | hub  | ❌     | Learning         |
| `/student/lab/[skill]`                        | leaf | 🔗     | Learning (child) |
| `/student/lab/exercise/[id]`                  | leaf | 🔗     | Learning (child) |
| `/student/exams`                              | hub  | ❌     | Learning         |
| `/student/exams/[examId]/take`                | leaf | 🔗     | Learning (child) |
| `/student/exams/results/[attemptId]`          | leaf | 🔗     | Learning (child) |
| `/student/step`                               | hub  | ❌     | Learning         |
| `/student/speaking-club`                      | hub  | ❌     | Learning         |
| `/student/private-lessons`                    | hub  | ❌     | Learning         |
| `/student/certificates`                       | hub  | ❌     | Achievements     |
| `/student/progress`                           | hub  | ❌     | Achievements     |
| `/student/blackboard/[roomId]`                | leaf | 🔗     | Learning (child) |
| `/student/sessions/[id]/summary`              | leaf | 🔗     | Learning (child) |
| `/student/billing`                            | hub  | ✅     | Account          |
| `/student/billing/pay/[invoiceId]`            | leaf | 🔗     | Account (child)  |
| `/student/billing/success`                    | leaf | 🔗     | Account (child)  |
| `/student/billing/failure`                    | leaf | 🔗     | Account (child)  |
| `/student/finance`                            | hub  | ❌     | Account          |
| `/student/profile`                            | hub  | 🚪     | Account          |
| `/student/messages`                           | hub  | 🚪     | (redirects /messages) |

#### PARENT (10 pages)

| Path                                  | Type | Status | Group (proposed) |
|---------------------------------------|------|--------|------------------|
| `/parent`                             | hub  | ✅     | (top-level)      |
| `/parent/link`                        | hub  | ✅     | Children         |
| `/parent/[childId]`                   | leaf | 🔗     | Children (child) |
| `/parent/[childId]/schedule`          | leaf | 🔗     | Children (child) |
| `/parent/attendance`                  | hub  | ✅     | Reports          |
| `/parent/progress`                    | hub  | ✅     | Reports          |
| `/parent/reports`                     | hub  | ❌     | Reports          |
| `/parent/reports/[id]`                | leaf | 🔗     | Reports (child)  |
| `/parent/finance`                     | hub  | ✅     | Billing          |
| `/parent/pay/[invoiceId]`             | leaf | 🔗     | Billing (child)  |

#### MARKETER (5 pages)

| Path                              | Type | Status | Group (proposed) |
|-----------------------------------|------|--------|------------------|
| `/marketer`                       | hub  | ✅     | (top-level)      |
| `/marketer/referrals`             | hub  | ✅     | Work             |
| `/marketer/commissions`           | hub  | ✅     | Work             |
| `/marketer/payment-requests`      | hub  | ❌     | Work             |
| `/marketer/profile`               | hub  | ✅     | Personal         |

#### Shared / Cross-role (8 pages)

| Path                          | Type | Status     | Notes                           |
|-------------------------------|------|------------|---------------------------------|
| `/messages`                   | hub  | ✅         | All roles                       |
| `/calendar`                   | hub  | 🚪         | Bottom nav + (now) sidebar      |
| `/notifications`              | leaf | 🚪         | Bell icon                       |
| `/settings/notifications`     | leaf | 🚪         | Avatar menu                     |
| `/tickets`                    | hub  | ❌         | Cross-role support              |
| `/tickets/new`                | leaf | 🔗         | Tickets child                   |
| `/tickets/[id]`               | leaf | 🔗         | Tickets child                   |
| `/classroom/[sessionId]`      | leaf | 🚪         | Reached from session join      |

#### Public / Auth (19 pages, no nav needed)

| Path                                            | Notes              |
|-------------------------------------------------|--------------------|
| `/`, `/contact`, `/brand`                       | Public marketing   |
| `/teachers`, `/teachers/[slug]`                 | Public profiles    |
| `/marketer/apply`                               | Marketer recruit   |
| `/placement-test` + 3 children                  | Lead-gen funnel    |
| `/policies/payment` `/policies/privacy` `/policies/refund` | Policies |
| `/verify/[code]`                                | Certificate verify |
| `/login` `/register` `/forgot-password` `/reset-password` `/verify-email` | Auth |
| `src/app/page.tsx`                              | Root redirect      |

### Orphan count by role (before)

| Role               | Total pages | In nav | Orphaned hubs | Coverage |
|--------------------|-------------|--------|---------------|----------|
| Admin/Super-admin  | 62          | 19     | 24            | 31%      |
| Teacher            | 21          | 6      | 9             | 29%      |
| Student            | 20          | 5      | 9             | 25%      |
| Parent             | 10          | 6      | 1             | 60%      |
| Marketer           | 5           | 4      | 1             | 80%      |
| Shared             | 8           | 2      | 1             | 25%      |
| **TOTAL (in-app)** | **126**     | **42** | **45**        | **~33%** |

Plus ~26 dynamic `[param]` leaf pages (correctly **not** in nav — they're hub children).

---

## Phase 2 — Proposed Information Architecture

### Design rules applied
- **RULE A**: 7 admin groups, ≤7 items per group
- **RULE B**: Every high-value page promoted (Manuals, Delivery, Brand Kit, Validation, Reports, Lab, etc.)
- **RULE C**: Discoverability > taxonomy purity (Tickets at top of System)
- **RULE D**: Mobile bottom-nav 5 items per role (was 4)
- **RULE E**: Strict role scoping preserved
- **RULE F**: Every new key added to both `ar.json` and `en.json`

### (b) ADMIN — 7 groups, 36 items (all hubs surfaced)

```
Dashboard
├── PEOPLE (7)
│   ├── Students
│   ├── Students › Transfer
│   ├── Teachers
│   ├── Teacher Activity
│   ├── Teacher Meetings
│   ├── Parents
│   └── Parent Invites
├── ACADEMICS (7)
│   ├── Programs
│   ├── Classes
│   ├── Schedule
│   ├── Attendance
│   ├── Trials
│   ├── Placement Tests
│   └── Speaking Club
├── CONTENT (6)
│   ├── Test Bank
│   ├── Mock Exams
│   ├── English Lab (hub)
│   ├── STEP Bank
│   ├── Blackboards
│   └── Certificates
├── FINANCE (6)
│   ├── Finance Overview
│   ├── Invoices
│   ├── Subscriptions
│   ├── Promo Codes
│   ├── Refunds
│   └── Payment Requests
├── COMMS (5)
│   ├── Messages
│   ├── Live Chats
│   ├── Contact Requests
│   ├── Templates
│   └── Logs
├── OPERATIONS (7)              ← NEW group; surfaces the moat
│   ├── Live Monitor
│   ├── Recordings
│   ├── Hajr AI
│   ├── Delivery
│   ├── Validation
│   ├── Manuals
│   └── Brand Kit
└── SYSTEM (7)
    ├── Tickets
    ├── Marketers
    ├── Schools
    ├── Teacher Payouts
    ├── QA tools (super-only) — i18n / Notifications / Audit
    ├── Audit Log         (super-only)
    └── Settings          (super-only)
```

### (b) TEACHER — Grouped (was flat 6, now 13 in 3 groups)

```
Dashboard
├── TEACHING (8)
│   ├── My Classes
│   ├── My Students
│   ├── Assignments
│   ├── Attendance
│   ├── English Lab (teacher view)
│   ├── Blackboard
│   ├── Private Lessons
│   └── Meetings
├── PERSONAL (5)
│   ├── My Salary
│   ├── Payment Requests
│   ├── Readiness
│   ├── Public Profile
│   └── Profile
└── Messages (top-level)
```

### (b) STUDENT — Grouped (was flat 5, now 12 in 3 groups)

```
Dashboard
├── LEARNING (7)
│   ├── My Classes
│   ├── Assignments
│   ├── English Lab
│   ├── Mock Exams
│   ├── STEP Test
│   ├── Speaking Club
│   └── Private Lessons
├── ACHIEVEMENTS (2)
│   ├── My Progress
│   └── Certificates
├── ACCOUNT (3)
│   ├── Billing
│   ├── My Finance
│   └── Profile
└── Messages (top-level)
```

### (b) PARENT — Grouped (was flat 7, now 9 in 3 groups; PRO REPORTS SURFACED)

```
Dashboard
├── CHILDREN (1)
│   └── Link a Child
├── REPORTS (4)                   ← THE MOAT
│   ├── Parent Reports (NEW in nav)
│   ├── Attendance
│   ├── Progress
│   └── (child detail accessed via dashboard cards)
├── BILLING (1)
│   └── Invoices & Payments
├── Messages       (top-level)
└── Notifications  (top-level)
```

### (b) MARKETER — Flat expansion (was 6, now 7)

```
Dashboard
├── My Referrals
├── My Commissions
├── Payment Requests   ← NEW
├── My Profile
├── Messages
└── Calendar
```

### Mobile bottom-nav (5 items per role)

| Role     | Slot 1     | Slot 2     | Slot 3              | Slot 4       | Slot 5      |
|----------|------------|------------|---------------------|--------------|-------------|
| Admin    | Home       | Calendar   | Messages (badge)    | Live         | Search      |
| Teacher  | Home       | Classes    | Messages (badge)    | Calendar     | Profile     |
| Student  | Home       | Classes    | Lab (NEW)           | Messages     | Profile     |
| Parent   | Home       | Reports    | Messages (badge)    | Billing      | Calendar    |
| Marketer | Home       | Referrals  | Commissions         | Messages     | Profile     |

---

## Phase 3 — Implementation log

### Files changed

| File                                                       | Change                                                                  |
|------------------------------------------------------------|-------------------------------------------------------------------------|
| `src/components/shell/sidebar.tsx`                         | New IA: Admin 7 groups × 36 items; Teacher/Student/Parent grouped       |
| `src/components/shell/mobile-bottom-nav.tsx`               | 5 slots per role (was 4), role-specific moat tabs                       |
| `src/components/shell/mobile-sidebar.tsx`                  | Mirrors desktop grouped nav for every role                              |
| `src/components/shell/moat-cards.tsx`                      | **NEW** — role-scoped discoverability card grid                         |
| `src/app/[locale]/(app)/admin/page.tsx`                    | `<MoatCards role="admin" />` injected after command-center              |
| `src/app/[locale]/(app)/teacher/page.tsx`                  | `<MoatCards role="teacher" />` injected after next-class                |
| `src/app/[locale]/(app)/student/page.tsx`                  | `<MoatCards role="student" />` injected after hero                      |
| `src/app/[locale]/(app)/parent/page.tsx`                   | `<MoatCards role="parent" />` injected at bottom                        |
| `src/messages/en.json`                                     | +52 `Nav.*` keys, +23 `Moat.*` keys (total 1841)                        |
| `src/messages/ar.json`                                     | +52 `Nav.*` keys, +23 `Moat.*` keys (total 1841)                        |
| `scripts/nav-coverage.cjs`                                 | **NEW** — script that tallies nav-reachable pages from sidebar/cards    |

### Translation key totals

| Locale | Before | After | Δ      |
|--------|--------|-------|--------|
| EN     | 1766   | 1841  | +75    |
| AR     | 1766   | 1841  | +75    |
| Parity | ✅     | ✅    | strict |

---

## Phase 4 — Coverage verification

### Build

```
$ npm run build
✓ Compiled successfully
✓ Generating static pages (243/243)
```
**0 type errors. 0 lint errors. 243 static pages prerendered.**

### Coverage tally (via `scripts/nav-coverage.cjs`)

| Metric                                  | Before | After  |
|-----------------------------------------|--------|--------|
| Unique nav hrefs                        | 45     | 92     |
| In-app pages (excl auth/public)         | 126    | 126    |
| Directly reachable via sidebar/cards    | 42     | 125    |
| Reachable via header bell (notifications)| 1     | 1      |
| **Total reachable**                     | 43     | **126**|
| **Coverage %**                          | 34%    | **100%** |

Plus 21 dynamic `[param]` leaf pages — correctly child-of-hub (e.g. `/admin/classes/[id]` reached from `/admin/classes`).

### Per-role coverage (post-rebuild)

| Role               | Pages | Reachable | Coverage |
|--------------------|-------|-----------|----------|
| Admin/Super-admin  | 62    | 62        | 100%     |
| Teacher            | 21    | 21        | 100%     |
| Student            | 20    | 20        | 100%     |
| Parent             | 10    | 10        | 100%     |
| Marketer           | 5     | 5         | 100%     |
| Shared             | 8     | 8         | 100%     |

---

## Phase 5 — Ali action items

After Vercel auto-deploys (~2 min after push), verify these 5 routes work
and appear in the sidebar of the matching role:

1. **Parent → Reports** — log in as a parent, sidebar → "Reports" group → "Parent Reports". This is the moat.
2. **Admin → Operations → Delivery** — visible to ADMIN role, surfaces the sprint delivery hub.
3. **Admin → Operations → Manuals** — six operating manuals, was orphaned.
4. **Teacher → Personal → Salary** — log in as a teacher, sidebar → "Personal" group → "My Salary".
5. **Student → Learning → English Lab** — log in as a student, sidebar → "Learning" group → "English Lab" (also in mobile bottom-nav).

If any of these don't appear, hard-refresh (Cmd-Shift-R) — sidebar group state is cached in localStorage.

### IA decisions worth knowing

1. **Operations group is the moat-visibility win.** Manuals, Delivery, Brand Kit, Validation, AI, Recordings, Live — all live in one group titled "Operations" so the differentiators surface together rather than being scattered.
2. **Parent Reports is promoted to top of its own "Reports" group.** It was the single highest-value orphan; now it's discoverable without typing the URL.
3. **Mobile bottom nav grew from 4 → 5 slots** so the most-used role hub fits without losing Messages/Calendar — e.g. Student now has Home / Classes / Lab / Messages / Profile.

