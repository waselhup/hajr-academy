import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

/**
 * GET /api/admin/communications/contacts — list visitor contact
 * submissions. Query: ?status=NEW|REPLIED|CLOSED ?q= ?page=
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const status = sp.get("status");
    const q = (sp.get("q") ?? "").trim();

    const where: Record<string, unknown> = {};
    if (status && ["NEW", "REPLIED", "CLOSED"].includes(status)) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows, counts] = await Promise.all([
      prisma.contactSubmission.count({ where }),
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.contactSubmission.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const byStatus = { NEW: 0, REPLIED: 0, CLOSED: 0 } as Record<string, number>;
    for (const c of counts) byStatus[c.status] = c._count._all;

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      counts: byStatus,
      submissions: rows.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        subject: s.subject,
        message: s.message,
        status: s.status,
        source: s.source,
        repliedBy: s.repliedBy,
        repliedAt: s.repliedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[api/admin/communications/contacts] failed:", e);
    return NextResponse.json(
      { error: "Failed to load contact requests" },
      { status: 500 }
    );
  }
}
