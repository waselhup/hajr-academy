import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/communications/chats/[threadId]/flag — flag (or
 * unflag) a message in a conversation as inappropriate.
 *
 * Body: { messageId, flagged: boolean, reason? }
 * Every flag change is written to the AuditLog.
 */
export async function POST(
  req: NextRequest,
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
    const body = await req.json();
    const messageId = String(body.messageId ?? "");
    const flagged = body.flagged !== false; // default true
    const reason = body.reason ? String(body.reason).slice(0, 280) : null;

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const message = await prisma.message.findFirst({
      where: { id: messageId, threadId: params.threadId },
      select: { id: true, flagged: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        flagged,
        flagReason: flagged ? reason : null,
        flaggedById: flagged ? session.user.id : null,
        flaggedAt: flagged ? new Date() : null,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: flagged ? "MESSAGE_FLAGGED" : "MESSAGE_UNFLAGGED",
      entity: "Message",
      entityId: messageId,
      metadata: { threadId: params.threadId, reason },
    });

    return NextResponse.json({ ok: true, flagged });
  } catch (e) {
    console.error("[api/admin/communications/chats/[threadId]/flag] failed:", e);
    return NextResponse.json({ error: "Failed to flag message" }, { status: 500 });
  }
}
