import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/teacher-earnings/[id]
 * Body: { action: "approve" | "pay" | "reject" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const action = body.action as "approve" | "pay" | "reject" | undefined;
  if (!action || !["approve", "pay", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const earning = await prisma.teacherEarning.findUnique({ where: { id } });
  if (!earning) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (action === "approve") {
      if (earning.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only PENDING earnings can be approved" },
          { status: 400 }
        );
      }
      const updated = await prisma.teacherEarning.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "TEACHER_EARNING_APPROVED",
          entity: "TeacherEarning",
          entityId: id,
          metadata: { amount: Number(earning.amount), teacherId: earning.teacherId },
        },
      });
      return NextResponse.json({ ok: true, earning: updated });
    }

    if (action === "pay") {
      if (earning.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Only APPROVED earnings can be marked paid" },
          { status: 400 }
        );
      }
      const updated = await prisma.teacherEarning.update({
        where: { id },
        data: { status: "PAID", paidAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "TEACHER_EARNING_PAID",
          entity: "TeacherEarning",
          entityId: id,
          metadata: { amount: Number(earning.amount), teacherId: earning.teacherId },
        },
      });
      return NextResponse.json({ ok: true, earning: updated });
    }

    // reject — delete the row
    await prisma.teacherEarning.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TEACHER_EARNING_REJECTED",
        entity: "TeacherEarning",
        entityId: id,
        metadata: {
          amount: Number(earning.amount),
          teacherId: earning.teacherId,
          classSessionId: earning.classSessionId,
        },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/teacher-earnings PATCH] failed:", e);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
