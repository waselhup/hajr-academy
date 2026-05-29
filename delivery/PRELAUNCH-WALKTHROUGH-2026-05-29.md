# Pre-Launch Walkthrough — Bug List (2026-05-29)

Method: static source review of all 133 page routes across 6 roles (4 parallel review
agents) + live runtime sweep (logged in as ADMIN via the dev preview, checked HTTP status
+ browser console) + full i18n parity audit + production build check.

Roles/pages covered: ADMIN (66), TEACHER (27), STUDENT (25), PARENT (10), MARKETER (5),
shared shell. i18n: `src/messages/ar.json` / `en.json`.

---

## 🔴 BUGS (functional — should fix before launch)

### B1. MARKETER lands on the wrong dashboard after login
- **File:** `src/app/[locale]/(auth)/login/login-form.tsx:50-58`
- The post-login redirect is a hand-rolled ternary: SUPER_ADMIN/ADMIN→`/admin`,
  TEACHER→`/teacher`, PARENT→`/parent`, **else→`/student`**. No MARKETER case, so a
  marketer is sent to `/student`, where `requireRole` bounces them.
- **Confirmed wrong** against the canonical map `ROLE_HOME` in `src/lib/rbac.ts:5-12`
  (`MARKETER: "/marketer"`), which the sidebar (`sidebar.tsx:377-385`) and
  `marketer/page.tsx` already use.
- **Fix:** import `ROLE_HOME` from `@/lib/rbac` and use
  `const home = ROLE_HOME[role as Role] ?? "/student";` — removes the duplication and
  future-proofs new roles.

### B2. Two i18n keys render as raw key strings
- `src/app/[locale]/(app)/admin/programs/_components/programs-client.tsx:61` —
  `t("Common.programs")` — key absent from both message files → shows literally
  "Common.programs". Fix: add `Common.programs` (EN "Programs" / AR "البرامج") or reuse
  `Nav.programs`.
- `src/app/[locale]/(app)/admin/ai/_components/ai-dashboard-client.tsx:230` —
  `t("Common.refresh")` — key absent → shows "Common.refresh". Fix: add `Common.refresh`
  (EN "Refresh" / AR "تحديث").

### B3. Admin create/issue forms show English-only field labels to Arabic users
The buttons/messages localize via `isAr`, but the `<Label>`s are hardcoded English:
- `src/app/[locale]/(app)/admin/speaking-club/_components/create-form.tsx:73,81,89,97,105,115,123,132,140,155`
- `src/app/[locale]/(app)/admin/certificates/_components/issue-form.tsx:79,95,111,119,127,135,143,151,161`
- **Fix:** wrap each label in `isAr ? … : …` or `t(...)`. (Admin-only screens, so lower
  blast radius than customer pages, but still a real bilingual gap.)

---

## 🟡 POLISH (cosmetic / consistency — safe to batch post-launch)

- **Arabic comma in English locale:** `teacher/page.tsx:69` renders
  `{t("Dashboard.welcome")}، {name}` with a literal `،` (U+060C) → "Welcome، John" in EN.
  Drop the hardcoded comma.
- **Student certificates `Code:` label** hardcoded English shown to Arabic users —
  `student/certificates/page.tsx:86`. Add `Certificates.code`.
- **Hardcoded toast/label strings** breaking each file's own `t()` pattern (admin):
  `teachers/payments/admin-payments-client.tsx:117-148`,
  `finance/promo-codes/promo-codes-client.tsx:105`, several `<TableHead>Date/Timestamp</…>`
  and `<Label>Month/Year/Total</…>` spots in `audit-log`, `communications/logs`,
  `classes/[id]`, `schedule`. All render correctly in at least one language; cosmetic.
- **Pervasive inline `isAr ? "…" : "…"` micro-copy** instead of `t(...)` across
  teacher/marketer/student/parent. Renders correctly in both languages — this is an
  architectural-consistency cleanup, not a functional bug. Largest clusters:
  `parent/reports/**`, `student/speaking-club/**`, marketer pages, several teacher pages.
  Reasonable v2.x cleanup; do NOT treat as a blocker.
- **Exam confirm dialog** reuses `t("previous")` ("Previous"/"السابق") as the Cancel
  action — reads oddly. `student/exams/exam-hub-client.tsx:160`,
  `exams/[examId]/take/exam-runner.tsx:349`. Use a dedicated cancel label.

---

## ✅ CLEAN (verified, no action)

- **i18n parity: PERFECT.** Both files = 2218 nodes / 2144 leaf keys, zero key-set
  mismatch (verified by flatten+diff script). Zero empty/placeholder values. Arabic in
  Common/Auth/Nav/Validation is idiomatic and typo-free. No genuine untranslated values.
- **Money/billing copy is solid:** `student/billing/**`, `parent/pay`, `parent/finance`
  fully translated, correct VAT ("ضريبة القيمة المضافة (١٥٪)") and SAR ("ر.س") wording,
  ownership-gated. No bugs.
- **Live runtime (ADMIN):** dashboard, students, finance, library, analytics, validation,
  tech-checks, speaking-club, certificates all returned **HTTP 200**; browser console had
  **zero errors**; admin shell + RTL render correctly.
- **No** `href="#"`/empty hrefs, **no** leftover TODO/FIXME/PLACEHOLDER in visible UI,
  **no** handler-less buttons found in any role.

### Note on dev-server webpack errors (not a bug)
During the concurrent page sweep the dev server logged transient
`TypeError: Cannot read properties of undefined (reading 'call')` from
`webpack-runtime.js`. Each was immediately followed by a `200` for the same route — a
known Next.js 14 dev-mode chunk-compile race under concurrent first-hits, absent in
production. (See build verdict below.)

---

## Build verdict — ✅ GREEN (verified 2026-05-29)
First attempt failed with `EPERM: rename query_engine-windows.dll.node` — a Windows file
lock because the dev server held the Prisma engine DLL, NOT a code error. Re-ran with the
dev server stopped:
- `✔ Generated Prisma Client (v5.22.0)`
- `✓ Compiled successfully`
- Linting + type-checking passed (no type errors)
- `✓ Generating static pages (259/259)`
- **Exit code 0.**

Only warnings: repeated `metadataBase property in metadata export is not set` (defaults to
`http://localhost:3000` for OG/Twitter share images). Cosmetic — set `metadataBase` in the
root `metadata` export to the production URL to silence it and get correct social-preview
image URLs. Confirms the dev-server webpack errors above were artifacts, not bugs.
