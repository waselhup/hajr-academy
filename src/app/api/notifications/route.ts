import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * GET /api/notifications — the current user's notifications.
 * Query: ?filter=all|unread, ?type=, ?page=
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const filter = sp.get("filter") ?? "all";
    const type = sp.get("type");
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));

    const where: Record<string, unknown> = { userId: session.user.id };
    if (filter === "unread") where.isRead = false;
    if (type) where.type = type;

    const [total, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        titleAr: n.titleAr,
        body: n.body,
        bodyAr: n.bodyAr,
        actionUrl: n.actionUrl,
        actionLabel: n.actionLabel,
        actionLabelAr: n.actionLabelAr,
        isRead: n.isRead,
        priority: n.priority,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[api/notifications] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
