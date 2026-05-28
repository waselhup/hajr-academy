/**
 * POST /api/analytics/page-visit
 *   — record a PageVisit row, lazily opening a UserSession for the user
 *     if none is open. Best-effort: never errors out.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { shortHash, ipFromHeaders, normalizeRoute } from "@/lib/analytics/hashing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<{
    route: string;
    enteredAt: string;
    leftAt: string;
  }>;
  if (!body.route || typeof body.route !== "string") {
    return NextResponse.json({ ok: true });
  }
  const route = normalizeRoute(body.route).slice(0, 200);
  const enteredAt = body.enteredAt ? new Date(body.enteredAt) : new Date();
  const leftAt = body.leftAt ? new Date(body.leftAt) : new Date();
  const durationSec = Math.max(
    0,
    Math.min(3600, Math.floor((leftAt.getTime() - enteredAt.getTime()) / 1000))
  );

  try {
    // Find or create an open UserSession (best-effort)
    let sessionRow = await prisma.userSession.findFirst({
      where: { userId: session.user.id, endedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true },
    });
    if (!sessionRow) {
      const ipHash = shortHash(ipFromHeaders(req.headers));
      const uaHash = shortHash(req.headers.get("user-agent"));
      sessionRow = await prisma.userSession.create({
        data: {
          userId: session.user.id,
          role: session.user.role,
          ipHash,
          userAgentHash: uaHash,
        },
        select: { id: true, startedAt: true },
      });
    }

    await prisma.pageVisit.create({
      data: {
        userId: session.user.id,
        sessionId: sessionRow.id,
        route,
        enteredAt,
        leftAt,
        durationSec,
      },
    });
  } catch (e) {
    // Best-effort; analytics must never disrupt UX
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics/page-visit]", (e as Error).message);
    }
  }
  return NextResponse.json({ ok: true });
}
