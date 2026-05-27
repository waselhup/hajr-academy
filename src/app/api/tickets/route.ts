/**
 * Sprint 3 — Tickets list + create.
 *
 * POST /api/tickets    — create + AI triage + notifyAdmins
 * GET  /api/tickets    — role-aware list (own / assigned / all for admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { triageTicket } from "@/lib/tickets/triage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (!isAdmin) {
    where.OR = [
      { requesterId: session.user.id },
      { assignedToId: session.user.id },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      requester: { select: { id: true, name: true, nameAr: true, email: true, avatar: true } },
      assignedTo: { select: { id: true, name: true, nameAr: true, avatar: true } },
      _count: { select: { replies: true } },
    },
    take: 200,
  });

  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subject = String(body.subject ?? "").trim();
  const text = String(body.body ?? "").trim();

  if (!subject || subject.length < 3) {
    return NextResponse.json({ error: "Subject required" }, { status: 400 });
  }
  if (!text || text.length < 5) {
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  }
  if (subject.length > 200 || text.length > 4000) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  const triage = await triageTicket(subject, text);

  const ticket = await prisma.ticket.create({
    data: {
      requesterId: session.user.id,
      requesterRole: session.user.role,
      subject,
      body: text,
      category: triage.category,
      priority: triage.priority,
      aiCategorized: triage.aiUsed,
      status: "OPEN",
    },
  });

  await audit.mutation(
    session.user.id,
    "TICKET_CREATED",
    "Ticket",
    ticket.id,
    { category: triage.category, priority: triage.priority, aiUsed: triage.aiUsed }
  );

  // Notify admins so triage doesn't sit idle.
  await notifyAdmins({
    type: "SYSTEM_ANNOUNCEMENT",
    title: `New ${ticket.priority} ticket: ${subject.slice(0, 60)}`,
    titleAr: `تذكرة جديدة (${ticket.priority}): ${subject.slice(0, 60)}`,
    body: text.slice(0, 200),
    bodyAr: text.slice(0, 200),
    channels: ["inApp", "realtime"],
    actionUrl: `/admin/tickets/${ticket.id}`,
    priority: ticket.priority === "URGENT" ? "URGENT" : "HIGH",
    refType: "Ticket",
    refId: ticket.id,
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
