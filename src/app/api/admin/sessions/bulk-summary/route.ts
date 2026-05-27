/**
 * Admin-only bulk regenerate lesson summaries.
 * Server-side rate-limit: 5 sessions/minute to Claude.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateLessonSummary } from "@/lib/ai/lesson-summary";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RATE_DELAY_MS = 12_000; // 5/min = 1 every 12s

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = (await req.json()) as { sessionIds?: string[] };
  const ids = (body.sessionIds ?? []).slice(0, 50);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, results: [] });
  }
  const results: { sessionId: string; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const r = await generateLessonSummary(id, {
        generatedById: session.user.id,
      });
      results.push({ sessionId: id, ok: true });
    } catch (e) {
      results.push({
        sessionId: id,
        ok: false,
        error: e instanceof Error ? e.message : "FAILED",
      });
    }
    if (i < ids.length - 1) await sleep(RATE_DELAY_MS);
  }
  await logAudit({
    action: "BULK_LESSON_SUMMARY",
    entity: "ClassSession",
    metadata: { total: ids.length, succeeded: results.filter((r) => r.ok).length },
  });
  return NextResponse.json({ ok: true, results });
}
