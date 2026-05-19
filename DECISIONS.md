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
