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

## Phase 4 — Hajr AI Layer

### D29. Dual-agent architecture: Admin Agent + Public Assistant
- **Decision**: Two distinct AI agents sharing a common engine. Admin Agent (Sonnet, 12 tools, unlimited) for SUPER_ADMIN/ADMIN. Public Assistant (Haiku→Sonnet escalation, 8 tools, rate-limited) for visitors/students/parents/teachers.
- **Why**: Different audiences need different models, tools, and cost profiles. Admins need deep data queries; public users need fast, cheap responses with escalation for complex questions.

### D30. Anthropic SDK with SSE streaming, no WebSocket
- **Decision**: `@anthropic-ai/sdk` with `ReadableStream` SSE — no WebSocket, no Vercel AI SDK.
- **Why**: Vercel Edge + SSE is simpler to deploy and debug than WebSocket. Direct SDK gives full control over tool loops and cost tracking without adapter overhead.

### D31. Haiku-first with auto-escalation to Sonnet
- **Decision**: Public Assistant defaults to `claude-haiku-4-5-20251001`; escalates to `claude-sonnet-4-6` when: message >200 chars, conversation >5 messages, tool returns >500 tokens, explicit "explain in detail", or sensitive topics (cancel/complaint).
- **Why**: Haiku is 3× cheaper and faster for simple FAQ/enrollment queries. Escalation preserves quality for complex or sensitive interactions.

### D32. Rate limiting via DB count (no Redis)
- **Decision**: Rate limits checked by counting `AgentMessage` rows in Prisma. Anonymous: 5 total per `visitorId` cookie. Authenticated: 50/day. Admin: unlimited.
- **Why**: Supabase PostgreSQL is already the bottleneck for tool queries; one extra count query is negligible. Avoids Redis dependency at current scale.

### D33. Cost tracking per API call, stored in DB
- **Decision**: Every Anthropic API call logs `inputTokens`, `outputTokens`, `costUsd` on `AgentMessage`; aggregates on `AgentConversation`. Admin dashboard shows SAR conversion (×3.75).
- **Why**: Must track AI spend for budgeting. Per-message granularity enables per-conversation cost display and monthly cost analysis.

### D34. TrialRequest model for lead capture
- **Decision**: Public Assistant's `book_trial` tool creates a `TrialRequest` record + notifies all admins. Separate `/admin/trials` page for status management (NEW→CONTACTED→SCHEDULED→COMPLETED→CONVERTED/DECLINED).
- **Why**: Converts anonymous chat engagement into trackable leads. Status workflow matches academy's manual follow-up process.

### D35. Cmd+K command palette + persistent chat panel for admin
- **Decision**: Two UIs for admin: Cmd+K spotlight for quick queries (dark overlay, ephemeral), and a persistent side-panel chat (Sheet-based, conversation history).
- **Why**: Cmd+K is fastest for one-off questions ("how many students?"); the panel suits multi-turn conversations ("analyze this class, then draft a message").

### D36. Schema applied via Supabase MCP (not prisma db push)
- **Decision**: New tables (AgentConversation, AgentMessage, TrialRequest) created via `execute_sql` through Supabase MCP.
- **Why**: `prisma db push` fails from this network (connection pooler unreachable). MCP connects directly to Supabase management API. Same pattern as Phase 2 (D12).

---

## Phase 5 — Blackboard (tldraw v3 + Supabase Realtime)

### D37. tldraw v3 with Supabase Realtime broadcast (no Liveblocks/Yjs/Partykit)
- **Decision**: Real-time sync uses Supabase Realtime `broadcast` channel per room. `BlackboardSync` class throttles local changes to 50ms, merges remote via `editor.store.mergeRemoteChanges()`.
- **Why**: Supabase Realtime is already provisioned (free tier, low-latency from MENA via ap-south-1). No extra infra or billing. Broadcast is fire-and-forget — ideal for ephemeral drawing events.

### D38. Snapshot debounce server-side (max 1 DB write per 5s per room)
- **Decision**: POST `/api/blackboard/[roomId]/snapshot` tracks `lastSavedAt` in-process memory Map. Returns 202 if called within 5s of last save.
- **Why**: Auto-save fires every 30s from host client. Manual saves can overlap. Debounce prevents DB thrashing without client-side coordination.

### D39. File upload validates magic bytes, not just MIME
- **Decision**: Upload endpoint reads first 4 bytes and matches against known signatures (PNG 89 50 4E 47, JPEG FF D8 FF, WebP RIFF, PDF %PDF).
- **Why**: MIME headers are trivially spoofable. Magic byte check catches renamed executables or polyglot files.

### D40. Fullscreen canvas layout overrides app shell
- **Decision**: `teacher/blackboard/[roomId]/layout.tsx` and `student/blackboard/[roomId]/layout.tsx` render a fixed `z-50` overlay, hiding sidebar/topbar.
- **Why**: tldraw needs 100vh/100vw canvas. The shell returns when user navigates back.

### D41. BlackboardPermission with per-student granularity + global toggle
- **Decision**: Two-level permission: `BlackboardRoom.allowStudentEdit` (global) and `BlackboardPermission` (per-student). UI shows both with toggles.
- **Why**: Teachers need both "everyone draws" (brainstorm) and "only Ali draws" (individual presentation) modes.

### D42. Admin agent tool `query_blackboards` added
- **Decision**: New tool registered in `adminTools[]` allows natural-language queries about blackboard activity.
- **Why**: Matches Phase 4 pattern — admin can ask "كم سبورة نشطة عند فاطمة؟" and get structured data back.

### D43. Schema migration via Supabase MCP (same as D36)
- **Decision**: `BlackboardPermission` table and `BlackboardRoom` column additions applied via `apply_migration` MCP tool.
- **Why**: Same network constraint. Prisma client regenerated locally for type safety.

---

## Phase 6 — English Lab + STEP Test Bank

### D44. 8 new models replace the Phase 1 stub models
- **Decision**: Phase 6 introduces `LabExercise`, `LabAttempt`, `SkillLevel`, `TestQuestion`, `TestExam`, `ExamQuestion`, `ExamAttempt`, `ExamAnswer` (+ 9 enums). The Phase 1 stubs `LabModule`/`LabProgress`/`StepTestBank`/`StepTestAttempt`/`StepTestAttemptItem` remain in the schema but are superseded.
- **Why**: The stubs lacked CEFR levels, per-skill tracking, AI evaluation fields, and exam structure. Rewriting beat retrofitting. Old tables left in place to avoid a destructive drop.

### D45. AI evaluation is a separate module, not the chat engine
- **Decision**: `lib/lab/ai-evaluator.ts` calls the Anthropic SDK directly with strict-JSON prompts, rather than routing through the Phase 4 streaming `runAgentLoop`.
- **Why**: Evaluation is a synchronous one-shot request returning structured JSON — a different shape from streaming chat. Haiku for short submissions, Sonnet for detailed/essay analysis. Results cached by content hash.

### D46. Graceful degradation when ANTHROPIC_API_KEY is absent
- **Decision**: The evaluator returns `{ needsManualReview: true }` with a bilingual message instead of throwing when the key is missing or the API fails. MC grading is pure JS and always works.
- **Why**: The lab must remain usable without AI; teachers can review writing/speaking manually. No hard dependency on the API for core flows.

### D47. Exam timer is server-authoritative
- **Decision**: `/api/exams/[examId]/start` returns an absolute `deadline` (startedAt + totalMinutes). The client counts down to it but the server clamps `timeSpentSec` on submit and accepts late/auto submissions.
- **Why**: A client-only timer is trivially bypassed. The deadline is computed once, server-side, from immutable `startedAt`.

### D48. Exam answer key never reaches the client
- **Decision**: `/start` strips `isCorrect` from options and omits `correctAnswer`/`explanation`. Correct answers are only returned by the results endpoint after submission.
- **Why**: Prevents cheating via browser devtools during a live exam.

### D49. Seed applied one statement at a time via a resilient applier
- **Decision**: `prisma/seed-phase-6.ts --emit-chunks` emits idempotent `INSERT ... ON CONFLICT DO NOTHING` SQL; `prisma/apply-chunks.ts` applies each statement individually with retry, resume detection, and skip-if-present.
- **Why**: The Supabase pgbouncer pooler intermittently drops long jobs (D11). Per-statement inserts complete within any timeout; `ON CONFLICT` makes re-runs safe; resume detection means an outage mid-run continues rather than restarts.

### D50. 8 new agent tools extend Phase 4 (4 admin + 4 public)
- **Decision**: Admin gains `query_lab_progress`, `query_weak_topics`, `recommend_exercises`, `generate_lab_content`. Public assistant gains `get_my_skill_levels`, `recommend_next_exercise`, `explain_question`, `practice_topic`. All follow the `AgentTool` interface and are registered in the respective `index.ts`.
- **Why**: Matches the Phase 4 pattern — the AI layer stays the single conversational surface, now lab-aware.
