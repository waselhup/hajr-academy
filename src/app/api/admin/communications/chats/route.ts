import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/communications/chats — browse every in-app conversation.
 *
 * Query: ?q= (participant name) ?role= (a participant's role)
 *        ?from=YYYY-MM-DD ?to=YYYY-MM-DD
 *
 * Read-only: admins see threads but cannot send as another user.
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
    const q = (sp.get("q") ?? "").trim().toLowerCase();
    const role = sp.get("role");
    const from = sp.get("from");
    const to = sp.get("to");

    const where: Record<string, unknown> = {
      channel: "IN_APP",
      triggerType: "MANUAL",
    };
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(`${from}T00:00:00`);
      if (to) createdAt.lte = new Date(`${to}T23:59:59`);
      where.createdAt = createdAt;
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });

    // Collapse to threads — keep latest message + counts.
    const threads = new Map<
      string,
      {
        threadId: string;
        participants: { id: string; name: string; role: string }[];
        lastMessage: string;
        lastAt: string;
        messageCount: number;
        flaggedCount: number;
      }
    >();

    for (const m of messages) {
      const t = threads.get(m.threadId);
      if (!t) {
        const parts = [m.fromUser, m.toUser].filter(Boolean) as {
          id: string;
          name: string;
          role: string;
        }[];
        threads.set(m.threadId, {
          threadId: m.threadId,
          participants: parts,
          lastMessage: m.attachmentUrl && !m.body
            ? `📎 ${m.attachmentName ?? "attachment"}`
            : m.body.slice(0, 120),
          lastAt: m.createdAt.toISOString(),
          messageCount: 1,
          flaggedCount: m.flagged ? 1 : 0,
        });
      } else {
        t.messageCount++;
        if (m.flagged) t.flaggedCount++;
        for (const u of [m.fromUser, m.toUser]) {
          if (u && !t.participants.some((p) => p.id === u.id)) {
            t.participants.push(u);
          }
        }
      }
    }

    let list = [...threads.values()];

    // Post-filter by participant name / role (in-memory; thread sets
    // are small after collapsing the 2k-message window).
    if (q) {
      list = list.filter((t) =>
        t.participants.some((p) => p.name.toLowerCase().includes(q))
      );
    }
    if (role) {
      list = list.filter((t) => t.participants.some((p) => p.role === role));
    }

    list.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));

    return NextResponse.json({ total: list.length, conversations: list });
  } catch (e) {
    console.error("[api/admin/communications/chats] failed:", e);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 }
    );
  }
}
