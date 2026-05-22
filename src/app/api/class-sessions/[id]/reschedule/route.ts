import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/class-sessions/[id]/reschedule — change a class session's
 * scheduled date/time.
 *
 * Allowed for an ADMIN/SUPER_ADMIN (any session) or the TEACHER who owns
 * the session's class (their own only). A LIVE/COMPLETED/CANCELLED
 * session cannot be rescheduled. Body: { scheduledDate } (ISO string).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const iso = typeof body.scheduledDate === "string" ? body.scheduledDate : "";
    const newDate = iso ? new Date(iso) : null;
    if (!newDate || Number.isNaN(newDate.getTime())) {
      return NextResponse.json(
        { error: "A valid scheduledDate is required" },
        { status: 400 }
      );
    }

    const cs = await prisma.classSession.findUnique({
      where: { id: params.id },
      include: { class: { include: { teacher: true } } },
    });
    if (!cs) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // A teacher may only reschedule their own class's sessions.
    if (session.user.role === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!tp || tp.id !== cs.class.teacherId) {
        return NextResponse.json(
          { error: "This is not your class" },
          { status: 403 }
        );
      }
    }

    if (cs.status === "LIVE") {
      return NextResponse.json(
        { error: "A live session cannot be rescheduled" },
        { status: 400 }
      );
    }
    if (cs.status === "COMPLETED" || cs.status === "CANCELLED") {
      return NextResponse.json(
        { error: "An ended session cannot be rescheduled" },
        { status: 400 }
      );
    }

    const previous = cs.scheduledDate;
    await prisma.classSession.update({
      where: { id: cs.id },
      data: { scheduledDate: newDate },
    });

    await logAudit({
      userId: session.user.id,
      action: "CLASS_SESSION_RESCHEDULED",
      entity: "ClassSession",
      entityId: cs.id,
      metadata: {
        classId: cs.classId,
        from: previous.toISOString(),
        to: newDate.toISOString(),
      },
    });

    // Notify enrolled students that the class time changed (best-effort).
    try {
      const { dispatch } = await import("@/lib/comms/dispatcher");
      const { fmtRiyadh } = await import("@/lib/format");
      await dispatch({
        toClassId: cs.classId,
        trigger: "CLASS_REMINDER",
        notificationType: "CLASS_STARTING",
        priority: "HIGH",
        channels: ["IN_APP", "EMAIL"],
        subject: "Class rescheduled / تم تغيير موعد الحصة",
        bodyEn: `Your class "${cs.class.nameAr ?? cs.class.name}" has been rescheduled to ${fmtRiyadh(newDate, "yyyy-MM-dd HH:mm")}.`,
        bodyAr: `تم تغيير موعد حصة "${cs.class.nameAr ?? cs.class.name}" إلى ${fmtRiyadh(newDate, "yyyy-MM-dd HH:mm")}.`,
        actionUrl: "/student/classes",
      });
    } catch (e) {
      console.error("[class-sessions/reschedule] notification failed:", e);
    }

    return NextResponse.json({
      ok: true,
      sessionId: cs.id,
      scheduledDate: newDate.toISOString(),
    });
  } catch (e) {
    console.error("[class-sessions/[id]/reschedule] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not reschedule the session" },
      { status: 500 }
    );
  }
}
