import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { canMessage } from "@/lib/comms/permissions";
import { sendEmail } from "@/lib/comms/email";
import { createNotification } from "@/lib/comms/in-app";
import { broadcastNewMessage } from "@/lib/chat/realtime";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages — list the current user's conversation threads.
 *
 * Each thread carries the latest message, the other party's identity,
 * and the unread count (messages addressed to this user, not yet read).
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  try {
    const messages = await prisma.message.findMany({
      where: {
        channel: "IN_APP",
        triggerType: "MANUAL",
        OR: [{ fromUserId: uid }, { toUserId: uid }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { select: { id: true, name: true, role: true, avatar: true } },
        toUser: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });

    const threads = new Map<
      string,
      {
        threadId: string;
        lastMessage: string;
        lastAt: string;
        lastFromMe: boolean;
        otherUserId: string;
        otherName: string;
        otherRole: string;
        otherAvatar: string | null;
        unread: number;
      }
    >();

    for (const m of messages) {
      const other = m.fromUserId === uid ? m.toUser : m.fromUser;
      if (!other) continue;
      const isUnreadForMe =
        m.toUserId === uid && m.status !== "READ" && m.readAt === null;
      const preview = m.attachmentUrl && !m.body
        ? `📎 ${m.attachmentName ?? "attachment"}`
        : m.body.slice(0, 120);
      const existing = threads.get(m.threadId);
      if (!existing) {
        threads.set(m.threadId, {
          threadId: m.threadId,
          lastMessage: preview,
          lastAt: m.createdAt.toISOString(),
          lastFromMe: m.fromUserId === uid,
          otherUserId: other.id,
          otherName: other.name,
          otherRole: other.role,
          otherAvatar: other.avatar,
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
 * POST /api/messages — send a message (new conversation or a reply).
 *
 * Body: { toUserId, subject?, body, threadId?, attachment? }
 * `attachment` = { url, name, type, size } from /api/messages/upload.
 *
 * Persists an IN_APP Message, notifies the recipient, broadcasts the
 * message on the thread's Realtime channel, and sends a best-effort
 * email copy.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;
  const role = session.user.role;
  const senderName = session.user.name ?? "Hajr A° user";

  try {
    const body = await req.json();
    const toUserId = String(body.toUserId ?? "");
    const text = String(body.body ?? "").trim();
    const subject = body.subject ? String(body.subject).trim() : null;
    const threadId = body.threadId ? String(body.threadId) : crypto.randomUUID();
    const parentMessageId = body.parentMessageId
      ? String(body.parentMessageId)
      : null;

    const attachment =
      body.attachment && typeof body.attachment === "object"
        ? {
            url: String(body.attachment.url ?? ""),
            name: String(body.attachment.name ?? "file"),
            type: String(body.attachment.type ?? ""),
            size: Number(body.attachment.size ?? 0),
          }
        : null;

    if (!toUserId || (!text && !attachment)) {
      return NextResponse.json(
        { error: "toUserId and a body or attachment are required" },
        { status: 400 }
      );
    }

    // Server-side permission check — never trust the client.
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
        attachmentUrl: attachment?.url || null,
        attachmentName: attachment?.name || null,
        attachmentType: attachment?.type || null,
        attachmentSize: attachment?.size || null,
      },
    });

    // Live broadcast on the thread channel.
    await broadcastNewMessage(threadId, {
      id: message.id,
      threadId,
      fromUserId: uid,
      fromName: senderName,
      body: text,
      attachmentUrl: message.attachmentUrl,
      attachmentName: message.attachmentName,
      attachmentType: message.attachmentType,
      attachmentSize: message.attachmentSize,
      createdAt: message.createdAt.toISOString(),
    });

    // In-app notification for the recipient.
    const preview = text ? text.slice(0, 140) : `📎 ${attachment?.name ?? "attachment"}`;
    await createNotification({
      userId: toUserId,
      type: "NEW_MESSAGE",
      title: `New message from ${senderName}`,
      titleAr: `رسالة جديدة من ${senderName}`,
      body: preview,
      bodyAr: preview,
      actionUrl: "/messages",
      actionLabel: "Open messages",
      actionLabelAr: "فتح الرسائل",
      refType: "Message",
      refId: message.id,
    });

    // Best-effort email copy.
    if (recipient.email && text) {
      sendEmail({
        to: recipient.email,
        subject: subject ?? `New message from ${senderName}`,
        html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
      }).catch(() => {});
    }

    await logAudit({
      userId: uid,
      action: "MESSAGE_SENT",
      entity: "Message",
      entityId: message.id,
      metadata: { toUserId, channel: "IN_APP", hasAttachment: !!attachment },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        threadId,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[api/messages] POST failed:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
