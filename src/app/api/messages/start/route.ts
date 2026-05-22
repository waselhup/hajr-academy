import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMessage } from "@/lib/comms/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/start — open (or resume) a conversation.
 *
 * Body: { toUserId }
 *
 * Validates the messaging permission, then returns the existing thread
 * between the two users if one exists, or a fresh threadId to use. This
 * keeps a pair of users on a single conversation rather than spawning a
 * new thread each time. No message is created here.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;
  const role = session.user.role;

  try {
    const body = await req.json();
    const toUserId = String(body.toUserId ?? "");
    if (!toUserId) {
      return NextResponse.json({ error: "toUserId is required" }, { status: 400 });
    }
    if (toUserId === uid) {
      return NextResponse.json(
        { error: "You cannot message yourself" },
        { status: 400 }
      );
    }

    // Server-side permission check.
    const allowed = await canMessage(uid, role, toUserId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not allowed to message this user" },
        { status: 403 }
      );
    }

    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true, role: true, avatar: true, isActive: true },
    });
    if (!recipient || !recipient.isActive) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Reuse an existing 1:1 thread if there is one.
    const existing = await prisma.message.findFirst({
      where: {
        channel: "IN_APP",
        triggerType: "MANUAL",
        OR: [
          { fromUserId: uid, toUserId },
          { fromUserId: toUserId, toUserId: uid },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { threadId: true },
    });

    return NextResponse.json({
      threadId: existing?.threadId ?? crypto.randomUUID(),
      isNew: !existing,
      other: {
        id: recipient.id,
        name: recipient.name,
        role: recipient.role,
        avatar: recipient.avatar,
      },
    });
  } catch (e) {
    console.error("[api/messages/start] failed:", e);
    return NextResponse.json(
      { error: "Failed to start conversation" },
      { status: 500 }
    );
  }
}
