/**
 * Sprint 3 — Admin assigns a ticket to an admin/super-admin user.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let body: { assignedToId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, subject: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.ticket.update({
    where: { id },
    data: { assignedToId: body.assignedToId ?? null },
  });

  await audit.mutation(session.user.id, "TICKET_ASSIGNED", "Ticket", id, {
    assignedToId: body.assignedToId,
  });

  if (body.assignedToId) {
    await notify({
      userId: body.assignedToId,
      type: "SYSTEM_ANNOUNCEMENT",
      title: `Ticket assigned: ${ticket.subject.slice(0, 60)}`,
      titleAr: `تم تعيين تذكرة لك: ${ticket.subject.slice(0, 60)}`,
      body: "You have been assigned a support ticket.",
      bodyAr: "تم تعيينك للرد على تذكرة دعم.",
      channels: ["inApp", "realtime"],
      actionUrl: `/admin/tickets/${id}`,
      refType: "Ticket",
      refId: id,
    });
  }

  return NextResponse.json({ ticket: updated });
}
