import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/[threadId] — all messages in a thread.
 *
 * Only a participant (sender or recipient of a message in the thread)
 * may read it. Reading also marks the user's inbound messages as READ.
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
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    if (messages.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Authorisation: the user must be a participant.
    const isParticipant = messages.some(
      (m) => m.fromUserId === uid || m.toUserId === uid
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark this user's inbound messages in the thread as read.
    await prisma.message.updateMany({
      where: {
        threadId: params.threadId,
        toUserId: uid,
        readAt: null,
      },
      data: { status: "READ", readAt: new Date() },
    });

    const other =
      messages[0].fromUserId === uid ? messages[0].toUser : messages[0].fromUser;

    return NextResponse.json({
      threadId: params.threadId,
      other: other ? { id: other.id, name: other.name } : null,
      messages: messages.map((m) => ({
        id: m.id,
        fromUserId: m.fromUserId,
        fromName: m.fromUser.name,
        body: m.body,
        subject: m.subject,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        mine: m.fromUserId === uid,
      })),
    });
  } catch (e) {
    console.error("[api/messages/[threadId]] GET failed:", e);
    return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
  }
}
