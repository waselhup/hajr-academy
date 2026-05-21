import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * GET /api/admin/comms/messages — searchable log of all messages.
 * Query: ?channel= ?status= ?q= (recipient name/subject) ?page=
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
    const channel = sp.get("channel");
    const status = sp.get("status");
    const q = (sp.get("q") ?? "").trim();

    const where: Record<string, unknown> = {};
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { toUser: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          toUser: { select: { name: true } },
          fromUser: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      messages: rows.map((m) => ({
        id: m.id,
        channel: m.channel,
        status: m.status,
        subject: m.subject,
        body: m.body.slice(0, 200),
        toName: m.toUser?.name ?? null,
        fromName: m.fromUser.name,
        triggerType: m.triggerType,
        errorMessage: m.errorMessage,
        sentAt: m.sentAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[api/admin/comms/messages] failed:", e);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
