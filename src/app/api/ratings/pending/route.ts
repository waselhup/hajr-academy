/**
 * GET /api/ratings/pending — does the caller have a rating they owe?
 *
 * For STUDENT: returns the most recent attended session in the last 24 h
 * that doesn't yet have a POST_SESSION rating; AND the list of teachers
 * the student hasn't rated MONTHLY for the current month.
 *
 * For PARENT: returns any (teacher, child) pair the parent hasn't rated
 * PARENT_MONTHLY for the current month.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  const role = session.user.role;
  try {
    if (role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true, enrollments: { select: { classId: true, status: true } } },
      });
      if (!sp) return NextResponse.json({ ok: true, postSession: null, monthly: [] });

      // Last 24h sessions the student attended
      const since = new Date(Date.now() - 24 * 3600_000);
      const att = await prisma.attendance.findFirst({
        where: {
          studentId: sp.id,
          status: { in: ["PRESENT", "LATE"] },
          session: { status: "COMPLETED", scheduledDate: { gte: since } },
        },
        orderBy: { session: { scheduledDate: "desc" } },
        include: {
          session: {
            include: {
              class: {
                select: {
                  id: true,
                  teacherId: true,
                  name: true,
                  nameAr: true,
                  teacher: { include: { user: { select: { name: true, nameAr: true } } } },
                },
              },
            },
          },
        },
      });

      let postSession = null;
      if (att) {
        const already = await prisma.teacherRating.findFirst({
          where: {
            sessionId: att.session.id,
            raterId: session.user.id,
            kind: "POST_SESSION",
          },
        });
        if (!already) {
          postSession = {
            sessionId: att.session.id,
            teacherId: att.session.class.teacherId,
            teacherName: att.session.class.teacher.user.nameAr || att.session.class.teacher.user.name,
            className: att.session.class.nameAr || att.session.class.name,
          };
        }
      }

      // Monthly ratings: one per active teacher
      const activeClasses = sp.enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.classId);
      const teachersList = activeClasses.length
        ? await prisma.class.findMany({
            where: { id: { in: activeClasses } },
            select: {
              teacherId: true,
              teacher: { include: { user: { select: { name: true, nameAr: true } } } },
            },
          })
        : [];
      const teacherIds = Array.from(new Set(teachersList.map((c) => c.teacherId)));
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const existing = await prisma.teacherRating.findMany({
        where: {
          teacherId: { in: teacherIds },
          raterId: session.user.id,
          kind: "MONTHLY",
          year,
          month,
        },
        select: { teacherId: true },
      });
      const ratedSet = new Set(existing.map((r) => r.teacherId));
      const monthly = teachersList
        .filter((c) => !ratedSet.has(c.teacherId))
        .map((c) => ({
          teacherId: c.teacherId,
          teacherName: c.teacher.user.nameAr || c.teacher.user.name,
        }));

      return NextResponse.json({ ok: true, postSession, monthly });
    }

    if (role === "PARENT") {
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
                    include: {
                      class: {
                        select: {
                          teacherId: true,
                          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!pp) return NextResponse.json({ ok: true, parent: [] });

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const existing = await prisma.teacherRating.findMany({
        where: {
          raterId: session.user.id,
          kind: "PARENT_MONTHLY",
          year,
          month,
        },
        select: { teacherId: true },
      });
      const ratedSet = new Set(existing.map((r) => r.teacherId));

      const items: Array<{
        studentId: string;
        studentName: string;
        teacherId: string;
        teacherName: string;
      }> = [];
      for (const link of pp.childLinks) {
        const seenTeachers = new Set<string>();
        for (const en of link.student.enrollments) {
          const tid = en.class.teacherId;
          if (seenTeachers.has(tid) || ratedSet.has(tid)) continue;
          seenTeachers.add(tid);
          items.push({
            studentId: link.studentId,
            studentName: link.student.user.nameAr || link.student.user.name,
            teacherId: tid,
            teacherName: en.class.teacher.user.nameAr || en.class.teacher.user.name,
          });
        }
      }
      return NextResponse.json({ ok: true, parent: items });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ratings/pending]", e);
    return NextResponse.json({ ok: true });
  }
}
