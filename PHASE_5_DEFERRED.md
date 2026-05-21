# Phase 5 — Deferred Items

Non-blocking observations found while completing the Blackboard feature.
None of these break the build or block Phase 5 sign-off. Review later.

---

## Blackboard-specific

### 1. Snapshot debounce is in-memory (cold-start safe but not cross-instance)
`src/app/api/blackboard/[roomId]/snapshot/route.ts` uses a module-level
`Map<string, number>` (`lastSavedAt`) for the 5s debounce. On Vercel each
serverless instance has its own Map, so concurrent instances can each accept
one write inside the same 5s window. Harmless (writes are idempotent
last-write-wins) but the debounce is weaker than it looks. A durable fix would
move the timestamp to the row itself or to a shared store.

### 2. Phase 5 API routes have no try/catch around Prisma
The route-stability pass wrapped all `page.tsx` server components, but the
blackboard API routes (`snapshot`, `grant-edit`, `revoke-edit`, `upload`,
`end-session`, `create`) still let a Prisma failure bubble to a 500. For API
routes a 500 is an acceptable failure mode (the client already handles
non-2xx), so this is lower priority than the page fix — but a consistent
`try/catch → NextResponse.json({error}, {status:500})` would be cleaner.

### 3. `mergeRemoteChanges` swallows all errors silently
`src/lib/blackboard/sync.ts` wraps remote record application in
`try {} catch {}` with only a comment. If records are systematically
malformed (e.g. a tldraw schema version mismatch), the board silently stops
syncing with no signal. Consider a counter + one-time console.warn so the
failure is at least observable.

### 4. Realtime presence has no stale-peer eviction
`onPresenceUpdate` reflects whatever Supabase presence reports. If a peer's
tab is killed without a clean `disconnect()`, Supabase eventually drops them,
but there is no client-side `lastSeenAt` timeout. Cosmetic — peer avatars may
linger briefly.

---

## Out of scope for Phase 5 (logged, not actioned per instructions)

### 5. Many non-page files still lack DB error handling
The route-stability commit covered `page.tsx` files only. API route handlers,
server actions, and `src/lib/*` data helpers across earlier phases (auth,
zoom, finance stubs, agent tools) are not audited. Not a Phase 5 concern.

---

_Generated during Phase 5 completion. Build is green; nothing here blocks._
