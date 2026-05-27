/**
 * Sprint 3 — Ticket reply.
 *
 * Posts a reply and broadcasts a Supabase realtime event on
 * `ticket:{ticketId}` so the detail page can show it live. Notifies the
 * "other side" of the conversation in-app + email.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { body?: string; isInternal?: boolean; attachmentUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const replyBody = String(body.body ?? "").trim();
  if (!replyBody || replyBody.length < 1 || replyBody.length > 4000) {
    return NextResponse.json({ error: "Reply text required" }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, requesterId: true, assignedToId: true, status: true, subject: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const isParticipant =
    ticket.requesterId === session.user.id ||
    ticket.assignedToId === session.user.id;
  if (!isAdmin && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isInternal = Boolean(body.isInternal) && isAdmin;

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId: id,
      authorId: session.user.id,
      authorRole: session.user.role,
      body: replyBody,
      isInternal,
      attachmentUrl: body.attachmentUrl ?? null,
    },
    include: {
      author: { select: { id: true, name: true, nameAr: true, avatar: true, role: true } },
    },
  });

  // First admin reply auto-moves OPEN → IN_PROGRESS.
  if (isAdmin && ticket.status === "OPEN" && !isInternal) {
    await prisma.ticket.update({
      where: { id },
      data: { status: "IN_PROGRESS", assignedToId: session.user.id },
    });
  }

  await audit.mutation(session.user.id, "TICKET_REPLIED", "Ticket", id, {
    replyId: reply.id,
    isInternal,
  });

  // Broadcast to anyone viewing the ticket detail page.
  try {
    const supabase = createSupabaseServiceClient();
    const ch = supabase.channel(`ticket:${id}`, {
      config: { broadcast: { ack: false } },
    });
    await ch.subscribe();
    await ch.send({
      type: "broadcast",
      event: "reply",
      payload: {
        id: reply.id,
        body: reply.body,
        isInternal: reply.isInternal,
        author: reply.author,
        createdAt: reply.createdAt,
      },
    });
    await supabase.removeChannel(ch);
  } catch (e) {
    console.warn("[tickets/reply] broadcast failed", e);
  }

  // Notify the other side (skip if this is an internal note).
  if (!isInternal) {
    const targetUserId =
      session.user.id === ticket.requesterId
        ? ticket.assignedToId
        : ticket.requesterId;
    if (targetUserId) {
      await notify({
        userId: targetUserId,
        type: "NEW_MESSAGE",
        title: `Reply on ticket: ${ticket.subject.slice(0, 60)}`,
        titleAr: `رد جديد على التذكرة: ${ticket.subject.slice(0, 60)}`,
        body: replyBody.slice(0, 200),
        bodyAr: replyBody.slice(0, 200),
        channels: ["inApp", "email", "realtime"],
        actionUrl: `/tickets/${id}`,
        priority: "NORMAL",
        refType: "Ticket",
        refId: id,
      });
    }
  }

  return NextResponse.json({ reply }, { status: 201 });
}
