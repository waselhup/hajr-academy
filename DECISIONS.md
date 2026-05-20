# Architectural Decisions Log — HAJR A° English Academy

> A running record of decisions taken during the build. Updated after each phase.

## Phase 1 — Foundation

### D1. App Router with locale segment
- **Decision**: Use Next.js 14 App Router with `app/[locale]/...` segments.
- **Why**: next-intl docs recommend it for SSR-aware locale resolution + RTL.

### D2. shadcn-style components hand-rolled
- **Decision**: Hand-rolled `Button`, `Input`, `Card`, etc. mirroring shadcn API.
- **Why**: Bakes brand tokens (e.g. `variant="cta"` = Rose Mauve) directly; idempotent CI.

### D3. Sonner over Radix Toast
- **Decision**: Sonner for user-facing toaster.
- **Why**: Better RTL support out of the box.

### D4. Decimal for money
- **Decision**: DB columns `Decimal(10,2)`; computation rounds at `.toFixed(2)`.
- **Why**: Avoids FP bugs without pulling in Decimal.js until Phase 7.

### D5. NextAuth v5 credentials + RBAC server-side
- **Decision**: All role guards via `requireRole` in Server Components / Server Actions.
- **Why**: Iron rule #3 — never trust client-side role checks.

### D6. Western digits everywhere (`.num` util)
- **Decision**: Numbers always rendered with `lnum`/LTR even in AR pages.
- **Why**: Spec section 6 RTL Behavior.

### D7. Logo as SVG (hand-coded), not bitmap
- **Decision**: `/public/hajr-logo.svg` matches Logo Proposal 03 in vector form.
- **Why**: Crisp at any DPR; brand colors driven by CSS, not anti-aliased PNG text.

---

## Phase 2 — Admin Core CRUDs

### D11. Supabase MCP for schema migration (Prisma `db push` workaround)
- **Decision**: Applied the full Phase 1 schema via Supabase MCP `apply_migration` rather than `prisma db push`.
- **Why**: The supplied `DATABASE_URL` / `DIRECT_URL` use the legacy `aws-0-ap-south-1.pooler.supabase.com` host, which returns `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` for this project (the project sits behind the newer `aws-1-ap-south-1` cluster). Even after pointing to the correct host, the postgres password supplied in the spec (`As1245667$$|$$`) fails `password authentication`. The MCP, however, authenticates as service-role and writes DDL/DML without password issues.
- **Trade-off**: Local Prisma data-path queries will fail until the postgres password is reset via the Supabase dashboard. The app builds cleanly because Prisma client only connects at request time, not at build time. Documented in `BLOCKERS.md` (see "Required: reset Supabase postgres password").
- **Mitigation**: Once a working password is in `.env`, no app code needs to change — Prisma client picks up the URL transparently.

### D12. Seed via MCP `execute_sql` rather than `npm run db:seed`
- **Decision**: Inserted Phase 1 baseline data (1 SUPER_ADMIN, 2 ADMIN, 4 TEACHER, 12 STUDENT (6M+6F), 6 PARENT, 5 Programs, 2 Classes, 12 Enrollments, 8 Sessions, 6 Invoices, 1 PartnerSchool) through Supabase MCP raw SQL.
- **Why**: Same auth bottleneck as D11 — `prisma db seed` couldn't connect. SQL inserts via MCP populate the live Riyadh region DB instantly.

### D13. Custom HTML weekly calendar instead of react-big-calendar
- **Decision**: Built a 7-column day grid via Tailwind grid + a deterministic color per teacher.
- **Why**: `react-big-calendar` pulls `moment.js` (~100 KB) and has known RTL quirks. The custom grid is ~120 LoC, fully RTL-aware via flex/grid, and respects Saudi Sunday-start weeks.

### D14. CSV via `papaparse`
- **Decision**: Bulk import + CSV exports use `papaparse` everywhere.
- **Why**: Stable, small, header-aware. Matches spec section 2.2 import requirement.

### D15. Server Actions in `_actions/*` per entity
- **Decision**: One `_actions/<entity>.ts` file per CRUD area (students, teachers, parents, programs, classes, schools, schedule).
- **Why**: Lets the page component stay a Server Component while keeping mutations co-located. Each action: `requireRole` → Zod parse → mutation → `logAudit` → `revalidatePath`.

### D16. Bulk invoice gen runs sequentially (not `createMany`)
- **Decision**: `bulkGenerateInvoicesAction` loops one-by-one to fetch the next sequential `invoiceNumber`.
- **Why**: `HAJR-YYYY-NNNNNN` requires per-row uniqueness. Performance is acceptable (≤ 6 students per class). If we need higher throughput later we'll switch to a DB sequence.

### D17. Gender enrollment guard centralised in `lib/invoice.ts` (with helper `isGenderAllowed`)
- **Decision**: Single source of truth used by `enrollStudentInClassAction` and tested in `__tests__/phase-2.test.ts`.
- **Why**: Matches spec Iron Rule on gender segregation and produces a predictable error code (`GENDER_MISMATCH`).

### D18. Cohort codes auto-generated via `lib/cohort.ts`
- **Decision**: `STEP-2026-Q2-A` format with `nextCohortLetter([existing])` to avoid letter collisions per program-year.
- **Why**: Spec 2.6 requires it and we want manual override possible (field is optional in the form).

### D19. Audit log retains JSON metadata + dual Hijri/Gregorian timestamps in UI
- **Decision**: Each row shows ISO + Hijri side-by-side, with expandable raw metadata.
- **Why**: Spec 2.9 + PDPL forensics. `moment-hijri` already on the dependency list from Phase 1.

---

## Phase 3 — Video Classroom (Zoom Web SDK + Auto-Attendance)

### D20. `ZoomMtgEmbedded` (Component View) over `ZoomMtg` (Client View)
- **Decision**: `/classroom/[sessionId]` mounts Zoom via `@zoom/meetingsdk/embedded` (`ZoomMtgEmbedded.createClient()`), not the legacy full-page `ZoomMtg` client.
- **Why**: The embedded client mounts inside a `<div ref>` we control, so it co-exists with Next.js routing and our brand chrome. The legacy `ZoomMtg` injects React 16 + global CSS — incompatible with the App Router.

### D21. `.npmrc` with `legacy-peer-deps=true`
- **Decision**: Committed `.npmrc` so both local installs and Vercel respect it.
- **Why**: `@zoom/meetingsdk@6` peer-pins `react@18.2.0`; our app is on `react@18.3.1`. The SDK runs fine on 18.3 — the pin is overly strict. Without the flag Vercel's `npm install` fails.

### D22. S2S OAuth token cached in module memory, refreshed 5 min early
- **Decision**: `ZoomProvider` caches the access token in a module-level variable; refreshes when < 5 min remain.
- **Why**: Zoom tokens live 1 h. A per-request fetch adds ~300 ms latency and risks rate limits. Module memory is per-Vercel-instance — acceptable.

### D23. Webhook verifies HMAC; `endpoint.url_validation` handled first
- **Decision**: `/api/zoom/webhook` answers the `url_validation` challenge (HMAC echo of `plainToken`) before the signature gate; every other event requires a valid `x-zm-signature` or is rejected 401.
- **Why**: The validation handshake is unsigned by design; everything else must be signed.

### D24. Webhook always returns 200 (except bad JSON / bad signature)
- **Decision**: Event-processing errors are caught, logged, and the handler still returns 200.
- **Why**: Zoom retries non-2xx aggressively; a transient DB hiccup shouldn't trigger a retry storm.

### D25. Single shared Zoom host account
- **Decision**: All API-created meetings use `ZOOM_HOST_EMAIL`; teachers join as SDK `role=1` via signature, students as `role=0`.
- **Why**: Matches supplied infra (one Zoom Basic account). The SDK host role gives teachers in-meeting host controls without each needing a licensed Zoom seat.

### D26. Auto-attendance + manual fallback both write `Attendance`
- **Decision**: Webhook upserts on `participant_joined/left`, finalizes on `meeting.ended`; `/teacher/attendance/[sessionId]` allows overrides (sets `markedBy`).
- **Why**: Spec requires both. `markedBy` distinguishes a manual override from a webhook auto-mark; the grid shows an `auto` badge when `joinedAt` is set but `markedBy` is null.

### D27. Rate limiter is in-memory token bucket
- **Decision**: `lib/rate-limit.ts` is a per-process `Map`; signature endpoint allows 10/min/user.
- **Why**: Zero extra infra at current scale. Swap for Vercel KV / Upstash when running many concurrent instances.

### D28. Classroom window computed on the fly (no cron)
- **Decision**: Join/start eligibility derives from `scheduledDate` + `durationMinutes` (host starts −15 min; everyone joins −15 min to +30 min after end).
- **Why**: No background job; the button self-enables each second client-side. The webhook still flips `ClassSession.status` for accurate monitoring.
