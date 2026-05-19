# Architectural Decisions Log — HAJR A° English Academy

> A running record of decisions taken during the build. Updated after each phase.

## Phase 1 — Foundation

### D1. App Router with locale segment
- **Decision**: Use Next.js 14 App Router with `app/[locale]/...` segments.
- **Why**: next-intl docs recommend it for SSR-aware locale resolution + RTL.
- **Trade-off**: Slightly more routing complexity vs. middleware-only redirection.

### D2. shadcn-style components hand-rolled
- **Decision**: Instead of running `npx shadcn init` (which is interactive and not idempotent in CI), we hand-rolled the components matching the same API (Button, Input, Card, etc.).
- **Why**: Avoids interactive prompts and lets us bake brand tokens directly into variants (e.g. `variant="cta"` = Rose Mauve).
- **Trade-off**: Manual upkeep when shadcn evolves — acceptable since the components are stable primitives.

### D3. Sonner over Radix Toast for toaster
- **Decision**: Use `sonner` for the user-facing toaster, but keep the Radix toast primitive available for advanced cases.
- **Why**: Sonner has better RTL support out of the box and a cleaner API.

### D4. Decimal (Prisma) for money, no `Decimal.js` until needed
- **Decision**: DB columns use `Decimal(10,2)`. Code accepts string/number and validates with Zod.
- **Why**: Avoids floating-point money bugs; can adopt `decimal.js` in Phase 7 (Finance) without schema change.

### D5. Auth pages live at `/[locale]/(auth)/...`, not `/api`
- **Decision**: Use NextAuth v5 (`next-auth@beta`). Credentials provider only for now; `/api/auth/[...nextauth]` is the canonical handler.
- **Why**: NextAuth v5 ships with App Router primitives; credentials suffice for Phase 1; OAuth providers can be added later.

### D6. RBAC enforced server-side via `requireRole`
- **Decision**: Each role's page calls `requireRole(...allowed)` which redirects offending users to their own home.
- **Why**: Matches Iron Rule #3 in spec — never trust client-side role checks.

### D7. Supabase Realtime (deferred), no Socket.io
- **Decision**: Plan to use Supabase Realtime for chat in Phase 5; Socket.io explicitly avoided.
- **Why**: Spec calls it out; Vercel serverless can't keep Socket.io connections.

### D8. Logo: SVG hand-written from the brand palette
- **Decision**: Built `/public/hajr-logo.svg` and `/public/favicon.svg` directly in code, matching Logo Proposal 03 (Charcoal Navy "HAJR" + thin Rose divider + Rose "A°").
- **Why**: The PNG source has anti-aliased text — re-rendering as text-in-SVG keeps it crisp and brand-aligned.

### D9. Western digits everywhere
- **Decision**: All numerals use Western digits (0-9) regardless of locale; `.num` utility class enforces LTR/lnum for inline numbers in RTL text.
- **Why**: Matches Section 6 RTL Behavior rule in spec.

### D10. Seed: 1 SUPER_ADMIN, 2 ADMIN, 4 TEACHER, 12 STUDENT (6M+6F), 6 PARENT, 5 Programs, 2 Classes, 12 Enrollments, 8 Sessions, 6 Invoices, 1 PartnerSchool
- **Decision**: Realistic Saudi names; teachers paired with Zoom host emails; one cohort per gender; mix of invoice statuses for finance previews.
- **Why**: Lets every dashboard show real data on first load.
