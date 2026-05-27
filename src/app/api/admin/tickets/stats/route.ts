/**
 * Sprint 3 — Admin ticket counts (used by the kanban header).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [open, inProgress, resolved, closed, urgent, high] = await Promise.all([
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { status: "CLOSED" } }),
    prisma.ticket.count({ where: { priority: "URGENT", status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.ticket.count({ where: { priority: "HIGH", status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  return NextResponse.json({
    byStatus: { OPEN: open, IN_PROGRESS: inProgress, RESOLVED: resolved, CLOSED: closed },
    urgent,
    high,
  });
}
