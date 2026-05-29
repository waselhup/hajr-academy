# Blockers — HAJR A° Build

## 🟡 OPEN (low): Intermittent P1001 on the transaction pooler (:6543) under cold connections

**Noticed:** 2026-05-29 while building the checkout flow. Same root family as the resolved
`/admin/classes` 500 — Supabase's pooler drops idle connections and Prisma fails the first
query after idle with `P1001 Can't reach database server`. Confirmed transient: the identical
request fails then succeeds on retry once the connection is warm.

**Mitigation applied:** added `connect_timeout=15` to the normalized `DATABASE_URL` in
`src/lib/prisma.ts` (gives Prisma more patience on cold pooler accept). This reduces but does
not fully eliminate P1001.

**Durable fix (deferred — touches foundation file, needs Ali sign-off):** wrap Prisma calls in
a small retry-on-P1001 helper, or move read-heavy server components to retry. Recommended for
v2.1. Not a launch blocker — user-facing pages already try/catch and the flow works on retry.

---


## ✅ RESOLVED: Intermittent 500 on /admin/classes (and other Prisma pages) — DIRECT_URL misconfig

**Status:** Resolved 2026-05-29 (Ali approved). Root cause: `DIRECT_URL` pointed at the
**transaction pooler** (`...pooler.supabase.com:6543`, no `pgbouncer=true`), which caused
intermittent `P1001` "Can't reach database server" under Vercel serverless cold starts.

The true direct host (`db.<ref>.supabase.co:5432`) is **IPv6-only** on this plan and
unreachable from Vercel serverless (IPv4-only) — that's why it was never used. Correct fix
is the Supabase serverless pattern:
- `DATABASE_URL` → transaction pooler `:6543` + `?pgbouncer=true` (was already correct).
- `DIRECT_URL` → **session pooler** `:5432` on the same IPv4 pooler host (changed from `:6543`).

Applied to local `.env` AND Vercel production env, then redeployed. Verified: local
`/ar/admin/classes` renders 2 classes (no P1001 in logs); production returns 307 (auth
redirect) not 500, and the authenticated page renders STEP/UNI class rows + "إضافة فصل".

> Note: this is the same credential flagged for rotation below — when rotating the password,
> update BOTH `DATABASE_URL` (:6543) and `DIRECT_URL` (:5432) consistently.

---

## ✅ RESOLVED: Supabase postgres password reset

**Status:** Resolved 2026-05-19. New password (`As1245667%%`, URL-encoded `As1245667%25%25`) authenticates against the v2 pooler `aws-1-ap-south-1.pooler.supabase.com:6543`.

**Verified via:**
```
$ node --env-file=.env -e "const p = new (require('@prisma/client').PrismaClient)(); …"
CONN OK. User counts by role:
   TEACHER → 4
   PARENT → 6
   ADMIN → 2
   STUDENT → 12
   SUPER_ADMIN → 1
Programs: 5 | Classes: 2 | Invoices: 6
```

`.env` and Vercel production env both updated; `/admin` routes now query the live Supabase Mumbai DB end-to-end.

---

## ✅ RESOLVED — CRITICAL: RLS disabled on all 72 tables → public data exposure (PDPL breach)

**Discovered:** 2026-05-29 (pre-launch walkthrough, Hajr AI Consultant).
**Resolved:** 2026-05-29, same session, with Ali's explicit approval (Option 2 — enable RLS, no policies).
**Severity:** CRITICAL — was a launch blocker.

### Fix applied (migration `enable_rls_all_public_tables_pdpl_lockdown`)
`ENABLE ROW LEVEL SECURITY` on all 72 public base tables, no policies → PostgREST returns
empty for anon/authenticated; Prisma direct connection bypasses RLS so app is unaffected.

### Post-fix verification (all passed)
- `pg_tables`: `rls_still_disabled = 0 / 72`.
- Anon-key REST re-probe of StudentProfile/User/Payment/Invoice/ParentReport/ParentProfile/
  Commission/Attendance/LessonSummary/Ticket → **all return `[]`** (were HTTP 200 + data before).
- Privileged/direct read (= Prisma path) still returns real counts (13 students, 27 users) → app intact.
- `supabase_realtime` publication is empty (no `postgres_changes`); realtime uses broadcast/presence → unaffected.
- `get_advisors(security)`: 72× `rls_disabled_in_public` **ERROR** → now 72× `rls_enabled_no_policy` **INFO** only. Zero security ERRORs remain.

### Still OPEN (separate follow-ups)
1. 🟡 **Rotate DB Postgres password** — it is committed in plaintext in this file (above) and in git history. Rotate in Supabase + update `.env`/Vercel, then it no longer matters that history retains the old one.
2. 🟢 **Optional hardening (post-launch, v2.x):** add proper per-role RLS policies so `authenticated` users can read their own rows via PostgREST if any future client-side feature needs it. Not required today (app uses Prisma server-side only).

---

### Historical detail (pre-fix)
The anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, shipped to every browser) could read every
`public` table directly via PostgREST, bypassing the Next.js `requireRole` guards. Proven by
external anon-key probe returning HTTP 200 + minors' data on StudentProfile, real emails on
User, and all financial tables. The fix was safe because Prisma uses a direct Postgres
connection (bypasses RLS) and realtime uses broadcast/presence only (needs no table grants).
The `library-content` storage bucket was hardened the same day (`allowed_mime_types` set to
the 7 types the upload route allows).

**STATUS: awaiting Ali approval before any production change. Documented per Rule #7 / #8.**
