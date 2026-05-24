# HAJR A° English Academy — Platform

> أكاديمية حجر للغة الإنجليزية — منصة التعلم الكاملة
> HAJR A° English Academy — Full learning platform

A complete, production-ready learning platform for HAJR A° English Academy: bilingual (Arabic-first, RTL), role-based (Super Admin / Admin / Teacher / Student / Parent), with live classrooms (Zoom Web SDK), an English Lab, STEP test prep, ZATCA-compliant invoicing (Moyasar), and Saudi-specific compliance (PDPL, gender-segregated classes, Saudi phone validation, Hijri/Gregorian dual calendar).

---

## 🏗️ Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript 5 strict |
| Styling | Tailwind CSS 3 + shadcn-style components + Radix UI |
| DB | Supabase Postgres (region: `me-central-1` / `ap-south-1`) |
| ORM | Prisma 5 |
| Auth | NextAuth.js v5 (credentials + RBAC) |
| i18n | next-intl (AR primary, EN secondary, full RTL) |
| State | Zustand (UI) + TanStack Query (server) |
| Forms | React Hook Form + Zod |
| Realtime | Supabase Realtime (Phase 5) |
| Video | Zoom Web SDK (primary) + Daily.co (fallback) (Phase 3) |
| Blackboard | tldraw v3 + sync (Phase 4) |
| Payments | Moyasar (Mada, Apple Pay, STC Pay) (Phase 7) |
| Email | Resend (Phase 8) |
| SMS | Unifonic (Saudi) (Phase 8) |
| Deploy | Vercel + Supabase |

---

## 🚀 Setup

### 1. Prerequisites
- Node 20+
- A Supabase project (closest region: `me-central-1` Bahrain or `ap-south-1` Mumbai)

### 2. Install
```bash
npm install
```

### 3. Environment variables
Copy `.env.example` to `.env.local` and fill in the values you have. Required for Phase 1:
- `DATABASE_URL`, `DIRECT_URL` (from Supabase → Project Settings → Database → Connection string)
- `AUTH_SECRET` (`openssl rand -base64 32`)
- `NEXTAUTH_URL` (`http://localhost:3000` locally)

### 4. Database
```bash
npm run db:push      # creates tables from prisma/schema.prisma
npm run db:seed      # creates 5 programs, 25 users, 2 classes, 12 enrollments, etc.
```

### 5. Dev server
```bash
npm run dev          # http://localhost:3000
```

### 6. Production build
```bash
npm run build
npm start
```

---

## 🔑 Seeded credentials

All users share password **`Hajr@2026`** (change in production).

| Role | Email |
|---|---|
| `SUPER_ADMIN` | `superadmin@hajracademy.com` |
| `ADMIN` | `admin@hajracademy.com`, `admin2@hajracademy.com` |
| `TEACHER` | `abdullah.t@hajracademy.com`, `noura.t@hajracademy.com`, `khalid.t@hajracademy.com`, `lama.t@hajracademy.com` |
| `STUDENT` (M) | `ali.s@example.com`, `omar.s@example.com`, `yousef.s@example.com`, … |
| `STUDENT` (F) | `sara.s@example.com`, `hessa.s@example.com`, `maha.s@example.com`, … |
| `PARENT` | `abu.ali@example.com`, `umm.omar@example.com`, … |

---

## 🌐 Routing

- `/` → redirect to `/ar`
- `/ar`, `/en` → public landing page
- `/{locale}/login`, `/register`, `/forgot-password`, `/verify-email`, `/reset-password`
- `/{locale}/admin/...` → `SUPER_ADMIN` + `ADMIN`
- `/{locale}/teacher/...` → `TEACHER`
- `/{locale}/student/...` → `STUDENT`
- `/{locale}/parent/...` → `PARENT`

---

## 🎨 Brand v3 — locked official palette

Proportion rule **70 / 15 / 10 / 3 / 2**. Rose is ACCENT ONLY — never a
large surface. JS-side constants live in [`src/lib/brand.ts`](src/lib/brand.ts);
CSS tokens in [`src/app/globals.css`](src/app/globals.css) +
[`tailwind.config.ts`](tailwind.config.ts).

```
Deep Navy     #1E2A36   70%   primary — sidebar, hero, CTAs (non-rose), footers
Charcoal Navy #2C3E50   15%   secondary text/headings, card titles
Ivory Silk    #FAF6EE   10%   page background only
Rose Mauve    #B86E7B    3%   ACCENT ONLY — CTAs, active link bar, logo "°"
Mint Frost    #B5E5D8    2%   support — success states, progress fills
```

Typography: **IBM Plex Sans Arabic** (AR) + **Inter** (EN), tracking-tight
for headings (-0.02em).

---

## 🧪 Tests

```bash
npm test           # vitest unit tests (Phase 10)
npm run test:e2e   # playwright e2e (Phase 10)
```

---

## 🗺️ Build phases

- [x] **Phase 1** — Foundation: auth, i18n, layout, seed
- [x] **Phase 2** — Admin CRUDs
- [x] **Phase 3** — Zoom Video Classroom
- [x] **Phase 4** — Hajr AI Layer (Admin Agent + Public Assistant)
- [x] **Phase 5** — Blackboard (tldraw v3 + Supabase Realtime sync)
- [x] **Phase 6** — English Lab + STEP Test Bank (AI evaluation, mock exams, skill tracking)
- [x] **Phase 7** — Communication + Notifications (Resend email, Unifonic SMS, in-app, messaging, auto-triggers)
- [ ] Phase 8 — Finance + ZATCA + Moyasar
- [ ] Phase 9 — Parent & School Portals
- [ ] Phase 10 — Polish + Compliance + Launch

See `DECISIONS.md` for decisions taken along the way.

---

## 🛡️ Compliance

- **Arabic-first** UI; English secondary; full RTL
- **ZATCA Phase 1** e-invoicing with TLV QR (Phase 7)
- **PDPL**: data export + right-to-delete (Phase 10)
- **Gender segregation** enforced in class enrollment and chat
- **Saudi phone validation** (`+9665XXXXXXXX`)
- **All timestamps UTC** in DB; UI in `Asia/Riyadh`
