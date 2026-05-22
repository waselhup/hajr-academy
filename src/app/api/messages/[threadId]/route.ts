import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastRead } from "@/lib/chat/realtime";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/[threadId] — all messages in a thread.
 *
 * Only a participant may read it. Reading also marks the user's inbound
 * messages READ and broadcasts a `read` event so the sender's UI can
 * flip its receipts live.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  try {
    const messages = await prisma.message.findMany({
      where: { threadId: params.threadId, channel: "IN_APP" },
      orderBy: { createdAt: "asc" },
      include: {
        fromUser: { select: { id: true, name: true, role: true, avatar: true } },
        toUser: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });

    if (messages.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const isParticipant = messages.some(
      (m) => m.fromUserId === uid || m.toUserId === uid
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark this user's inbound messages as read.
    const unreadIds = messages
      .filter((m) => m.toUserId === uid && m.readAt === null)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      const readAt = new Date();
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { status: "READ", readAt },
      });
      // Tell the other party their messages were seen.
      broadcastRead(params.threadId, {
        threadId: params.threadId,
        readerUserId: uid,
        readAt: readAt.toISOString(),
      }).catch(() => {});
    }

    const first = messages[0];
    const other = first.fromUserId === uid ? first.toUser : first.fromUser;

    return NextResponse.json({
      threadId: params.threadId,
      other: other
        ? { id: other.id, name: other.name, role: other.role, avatar: other.avatar }
        : null,
      messages: messages.map((m) => ({
        id: m.id,
        fromUserId: m.fromUserId,
        fromName: m.fromUser.name,
        body: m.body,
        subject: m.subject,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentType: m.attachmentType,
        attachmentSize: m.attachmentSize,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        status: m.status,
        mine: m.fromUserId === uid,
      })),
    });
  } catch (e) {
    console.error("[api/messages/[threadId]] GET failed:", e);
    return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
  }
}
