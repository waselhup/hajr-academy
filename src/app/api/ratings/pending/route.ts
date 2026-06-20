/**
 * GET /api/ratings/pending — returns AT MOST ONE feedback prompt the caller owes,
 * so students are never nagged repeatedly.
 *
 * STUDENT (in priority order):
 *   1. CLASS    — the most recent attended COMPLETED session (last 7 days) that
 *                 hasn't been rated and wasn't skipped → once per class.
 *   2. MONTHLY  — once per calendar month for students with an ACTIVE enrollment
 *                 (a subscription), unless already submitted or skipped this month.
 * PARENT: one MONTHLY prompt per month, deduped the same way.
 *
 * Dedupe is DB-backed (TeacherRating for submissions + FeedbackPromptLog for skips),
 * so a skip persists across reloads/devices — fixing the "shows on every page" bug.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  const role = session.user.role;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  try {
    if (role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true, enrollments: { select: { classId: true, status: true } } },
      });
      if (!sp) return NextResponse.json({ ok: true, postSession: null, monthly: null });

      const logs = await prisma.feedbackPromptLog.findMany({
        where: { userId: session.user.id },
        select: { kind: true, refKey: true },
      });
      const skipped = new Set(logs.map((l) => `${l.kind}:${l.refKey}`));

      // 1) After-class rating — most recent attended completed session (7-day window).
      const since = new Date(Date.now() - 7 * 24 * 3600_000);
      const atts = await prisma.attendance.findMany({
        where: {
          studentId: sp.id,
          status: { in: ["PRESENT", "LATE"] },
          session: { status: "COMPLETED", scheduledDate: { gte: since } },
        },
        orderBy: { session: { scheduledDate: "desc" } },
        take: 10,
        include: {
          session: {
            include: {
              class: {
                select: {
                  id: true, teacherId: true, name: true, nameAr: true,
                  teacher: { include: { user: { select: { name: true, nameAr: true } } } },
                },
              },
            },
          },
        },
      });
      for (const a of atts) {
        if (skipped.has(`CLASS:${a.session.id}`)) continue;
        const rated = await prisma.teacherRating.findFirst({
          where: { sessionId: a.session.id, raterId: session.user.id, kind: "POST_SESSION" },
          select: { id: true },
        });
        if (rated) continue;
        return NextResponse.json({
          ok: true,
          postSession: {
            sessionId: a.session.id,
            teacherId: a.session.class.teacherId,
            teacherName: a.session.class.teacher.user.nameAr || a.session.class.teacher.user.name,
            className: a.session.class.nameAr || a.session.class.name,
          },
          monthly: null,
        });
      }

      // 2) Monthly subscription feedback — once per month for active students.
      if (skipped.has(`MONTHLY:${monthKey}`)) return NextResponse.json({ ok: true, postSession: null, monthly: null });
      const activeClassIds = sp.enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.classId);
      if (activeClassIds.length === 0) return NextResponse.json({ ok: true, postSession: null, monthly: null });
      const submitted = await prisma.teacherRating.findFirst({
        where: { raterId: session.user.id, kind: "MONTHLY", year, month },
        select: { id: true },
      });
      if (submitted) return NextResponse.json({ ok: true, postSession: null, monthly: null });
      const primary = await prisma.class.findFirst({
        where: { id: { in: activeClassIds } },
        orderBy: { createdAt: "desc" },
        select: { teacherId: true, teacher: { select: { user: { select: { name: true, nameAr: true } } } } },
      });
      if (!primary) return NextResponse.json({ ok: true, postSession: null, monthly: null });
      return NextResponse.json({
        ok: true,
        postSession: null,
        monthly: {
          teacherId: primary.teacherId,
          teacherName: primary.teacher.user.nameAr || primary.teacher.user.name,
          monthKey,
        },
      });
    }

    if (role === "PARENT") {
      const logs = await prisma.feedbackPromptLog.findMany({
        where: { userId: session.user.id, kind: "MONTHLY" },
        select: { refKey: true },
      });
      if (logs.some((l) => l.refKey === monthKey)) return NextResponse.json({ ok: true, parent: null });
      const submitted = await prisma.teacherRating.findFirst({
        where: { raterId: session.user.id, kind: "PARENT_MONTHLY", year, month },
        select: { id: true },
      });
      if (submitted) return NextResponse.json({ ok: true, parent: null });
      const pp = await prisma.parentProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          childLinks: {
            include: {
              student: {
                include: {
                  user: { select: { name: true, nameAr: true } },
                  enrollments: {
                    where: { status: "ACTIVE" },
                    include: { class: { select: { teacherId: true, teacher: { select: { user: { select: { name: true, nameAr: true } } } } } } },
                  },
                },
              },
            },
          },
        },
      });
      if (!pp) return NextResponse.json({ ok: true, parent: null });
      for (const link of pp.childLinks) {
        const en = link.student.enrollments[0];
        if (en) {
          return NextResponse.json({
            ok: true,
            parent: {
              studentId: link.studentId,
              studentName: link.student.user.nameAr || link.student.user.name,
              teacherId: en.class.teacherId,
              teacherName: en.class.teacher.user.nameAr || en.class.teacher.user.name,
              monthKey,
            },
          });
        }
      }
      return NextResponse.json({ ok: true, parent: null });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ratings/pending]", e);
    return NextResponse.json({ ok: true });
  }
}
