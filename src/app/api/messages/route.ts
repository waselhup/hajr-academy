import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { canMessage } from "@/lib/comms/permissions";
import { sendEmail } from "@/lib/comms/email";
import { createNotification } from "@/lib/comms/in-app";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages — list the current user's conversations.
 *
 * A "conversation" is a thread; we return the latest message of each
 * IN_APP thread the user is part of, plus the unread count and the
 * other party's identity.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  try {
    // Direct (IN_APP, user-to-user) messages this user sent or received.
    const messages = await prisma.message.findMany({
      where: {
        channel: "IN_APP",
        triggerType: "MANUAL",
        OR: [{ fromUserId: uid }, { toUserId: uid }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });

    // Group by thread; keep the latest message and count unread.
    const threads = new Map<
      string,
      {
        threadId: string;
        lastMessage: string;
        lastAt: string;
        otherUserId: string;
        otherName: string;
        otherRole: string;
        unread: number;
      }
    >();

    for (const m of messages) {
      const other = m.fromUserId === uid ? m.toUser : m.fromUser;
      if (!other) continue;
      const existing = threads.get(m.threadId);
      const isUnreadForMe =
        m.toUserId === uid && m.status !== "READ" && m.readAt === null;
      if (!existing) {
        threads.set(m.threadId, {
          threadId: m.threadId,
          lastMessage: m.body.slice(0, 120),
          lastAt: m.createdAt.toISOString(),
          otherUserId: other.id,
          otherName: other.name,
          otherRole: other.role,
          unread: isUnreadForMe ? 1 : 0,
        });
      } else if (isUnreadForMe) {
        existing.unread++;
      }
    }

    return NextResponse.json({
      conversations: [...threads.values()].sort(
        (a, b) => +new Date(b.lastAt) - +new Date(a.lastAt)
      ),
    });
  } catch (e) {
    console.error("[api/messages] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages — send a new message (or a reply).
 *
 * Body: { toUserId, subject?, body, threadId? }
 *
 * Creates an IN_APP Message, an in-app Notification for the recipient,
 * and a best-effort email copy.
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
    const text = String(body.body ?? "").trim();
    const subject = body.subject ? String(body.subject).trim() : null;
    const threadId = body.threadId ? String(body.threadId) : crypto.randomUUID();
    const parentMessageId = body.parentMessageId
      ? String(body.parentMessageId)
      : null;

    if (!toUserId || !text) {
      return NextResponse.json(
        { error: "toUserId and body are required" },
        { status: 400 }
      );
    }

    // Permission check.
    const allowed = await canMessage(uid, role, toUserId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not allowed to message this user" },
        { status: 403 }
      );
    }

    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true, email: true, preferredLang: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        threadId,
        fromUserId: uid,
        toUserId,
        subject,
        body: text,
        channel: "IN_APP",
        status: "SENT",
        sentAt: new Date(),
        triggerType: "MANUAL",
        parentMessageId,
      },
    });

    // In-app notification for the recipient.
    await createNotification({
      userId: toUserId,
      type: "NEW_MESSAGE",
      title: `New message from ${session.user.name}`,
      titleAr: `رسالة جديدة من ${session.user.name}`,
      body: text.slice(0, 140),
      bodyAr: text.slice(0, 140),
      actionUrl: "/messages",
      actionLabel: "Open messages",
      actionLabelAr: "فتح الرسائل",
      refType: "Message",
      refId: message.id,
    });

    // Best-effort email copy (mock-sent if no key).
    if (recipient.email) {
      sendEmail({
        to: recipient.email,
        subject: subject ?? `New message from ${session.user.name}`,
        html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
      }).catch(() => {});
    }

    await logAudit({
      userId: uid,
      action: "MESSAGE_SENT",
      entity: "Message",
      entityId: message.id,
      metadata: { toUserId, channel: "IN_APP" },
    });

    return NextResponse.json({ message: { id: message.id, threadId } });
  } catch (e) {
    console.error("[api/messages] POST failed:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
