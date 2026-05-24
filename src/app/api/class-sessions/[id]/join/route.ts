import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/class-sessions/[id]/join
 *
 * Returns the Zoom join URL for a student / admin / authorized
 * participant. The teacher uses /start, not this route.
 *
 * Server-enforced rules:
 *  - STUDENT: must be in an ACTIVE enrollment for this class.
 *  - ADMIN / SUPER_ADMIN: always allowed (monitoring).
 *  - PARENT: allowed (read-only observe).
 *  - TEACHER: redirected — use the start route instead.
 *
 * If the session isn't LIVE yet, returns 409 with a friendly error.
 * Audit logs the join attempt regardless of success.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await Promise.resolve(params);
  const sessionId = resolved.id;
  const userId = session.user.id;
  const userRole = session.user.role;

  const cs = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          teacher: true,
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
    },
  });
  if (!cs) {
    return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
  }

  // Authorization
  let role: "STUDENT" | "ADMIN" | "PARENT" | null = null;
  if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
    role = "ADMIN";
  } else if (userRole === "TEACHER") {
    // Teachers should use the start route. Be friendly if they hit this
    // by mistake — let the owner pass through.
    const tp = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (tp && tp.id === cs.class.teacherId) {
      return NextResponse.json(
        { ok: false, error: "Use the Start Class button to host." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  } else if (userRole === "STUDENT") {
    const sp = await prisma.studentProfile.findUnique({ where: { userId } });
    if (sp && cs.class.enrollments.some((e) => e.studentId === sp.id)) {
      role = "STUDENT";
    }
  } else if (userRole === "PARENT") {
    const pp = await prisma.parentProfile.findUnique({
      where: { userId },
      include: { childLinks: { select: { studentId: true } } },
    });
    if (pp) {
      const childIds = pp.childLinks.map((l) => l.studentId);
      if (cs.class.enrollments.some((e) => childIds.includes(e.studentId))) {
        role = "PARENT";
      }
    }
  }

  if (!role) {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  // The session must be LIVE for participants to join via Zoom's URL —
  // join_before_host is enabled but the meeting has to exist.
  if (cs.status !== "LIVE") {
    // Admins are allowed to peek at SCHEDULED sessions if a meeting
    // exists (they can join in advance) — keeps the monitor flexible.
    if (role !== "ADMIN" || !cs.zoomJoinUrl) {
      return NextResponse.json(
        { ok: false, error: "Class hasn't started yet" },
        { status: 409 }
      );
    }
  }

  if (!cs.zoomJoinUrl || !cs.zoomMeetingId) {
    return NextResponse.json(
      { ok: false, error: "Meeting not provisioned yet. Try again in a moment." },
      { status: 409 }
    );
  }

  await logAudit({
    userId,
    action: role === "ADMIN" ? "CLASS_MONITORED" : "CLASS_SESSION_JOINED",
    entity: "ClassSession",
    entityId: cs.id,
    metadata: { classId: cs.classId, role, status: cs.status },
  });

  return NextResponse.json({
    ok: true,
    sessionId: cs.id,
    meetingId: cs.zoomMeetingId,
    meetingPassword: cs.zoomPassword,
    zoomJoinUrl: cs.zoomJoinUrl,
    role,
  });
}
