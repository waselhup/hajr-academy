import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/communications/chats/[threadId] — read any conversation.
 *
 * Strictly read-only. The admin viewing a thread is NOT a participant,
 * so this never marks messages as read and never sends.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: { threadId: params.threadId, channel: "IN_APP" },
      orderBy: { createdAt: "asc" },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });

    if (messages.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const participants = new Map<
      string,
      { id: string; name: string; role: string }
    >();
    for (const m of messages) {
      for (const u of [m.fromUser, m.toUser]) {
        if (u) participants.set(u.id, u);
      }
    }

    return NextResponse.json({
      threadId: params.threadId,
      participants: [...participants.values()],
      messages: messages.map((m) => ({
        id: m.id,
        fromUserId: m.fromUserId,
        fromName: m.fromUser.name,
        fromRole: m.fromUser.role,
        toName: m.toUser?.name ?? null,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentType: m.attachmentType,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        flagged: m.flagged,
        flagReason: m.flagReason,
      })),
    });
  } catch (e) {
    console.error("[api/admin/communications/chats/[threadId]] failed:", e);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 }
    );
  }
}
