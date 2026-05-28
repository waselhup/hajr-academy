/**
 * GET /api/admin/analytics/users/[id] — drill down per user.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;
  try {
    const [user, sessions, visits] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, nameAr: true, email: true, role: true },
      }),
      prisma.userSession.findMany({
        where: { userId: id },
        orderBy: { startedAt: "desc" },
        take: 50,
      }),
      prisma.pageVisit.findMany({
        where: { userId: id },
        orderBy: { enteredAt: "desc" },
        take: 200,
      }),
    ]);
    return NextResponse.json({ ok: true, user, sessions, visits });
  } catch (e) {
    console.error("[analytics/user]", e);
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }
}
