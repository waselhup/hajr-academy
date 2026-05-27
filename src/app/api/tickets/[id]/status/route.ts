/**
 * Sprint 3 — Ticket status mutation (admin) or close-by-requester.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import type { TicketStatus, TicketPriority } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const VALID_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  let body: { status?: string; priority?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, requesterId: true, status: true, subject: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin && ticket.requesterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, unknown> = {};

  if (body.status && VALID_STATUSES.includes(body.status as TicketStatus)) {
    update.status = body.status;
    if (body.status === "RESOLVED") update.resolvedAt = new Date();
    if (body.status === "CLOSED") update.closedAt = new Date();
  }
  if (body.priority && VALID_PRIORITIES.includes(body.priority as TicketPriority) && isAdmin) {
    update.priority = body.priority;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: update,
  });

  await audit.mutation(session.user.id, "TICKET_STATUS_CHANGED", "Ticket", id, update);

  // Notify requester on status changes by admin.
  if (isAdmin && ticket.requesterId !== session.user.id && update.status) {
    await notify({
      userId: ticket.requesterId,
      type: "SYSTEM_ANNOUNCEMENT",
      title: `Ticket ${update.status}: ${ticket.subject.slice(0, 60)}`,
      titleAr: `تحديث التذكرة (${update.status}): ${ticket.subject.slice(0, 60)}`,
      body: `Your ticket status changed to ${update.status}.`,
      bodyAr: `تم تغيير حالة تذكرتك إلى ${update.status}.`,
      channels: ["inApp", "email"],
      actionUrl: `/tickets/${id}`,
      refType: "Ticket",
      refId: id,
    });
  }

  return NextResponse.json({ ticket: updated });
}
