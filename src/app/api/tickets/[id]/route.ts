/**
 * Sprint 3 — Single ticket fetch.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, nameAr: true, email: true, avatar: true, role: true } },
      assignedTo: { select: { id: true, name: true, nameAr: true, avatar: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, nameAr: true, avatar: true, role: true } },
        },
      },
    },
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

  // Hide internal notes from non-admins.
  if (!isAdmin) {
    ticket.replies = ticket.replies.filter((r) => !r.isInternal);
  }

  return NextResponse.json({ ticket });
}
