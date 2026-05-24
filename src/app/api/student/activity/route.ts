import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentScope } from "@/lib/student/scope";

export const dynamic = "force-dynamic";

type ActivityType =
  | "ASSIGNMENT_NEW"
  | "ASSIGNMENT_GRADED"
  | "EXAM_RESULT"
  | "INVOICE_DUE"
  | "CLASS_REMINDER";

interface ActivityItem {
  id: string;
  type: ActivityType;
  time: string; // ISO
  href: string;
  data: Record<string, string | number>;
}

/**
 * GET /api/student/activity
 * Unified activity stream — 10 most recent items across types.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const scope = await getStudentScope(session.user.id);
  if (!scope) {
    return NextResponse.json({ items: [] });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const next24h = new Date(Date.now() + 24 * 3600_000);

  const [newAssignments, gradedSubmissions, examResults, dueInvoices, upcomingSessions] =
    await Promise.all([
      // New assignments — last 7d
      prisma.assignment.findMany({
        where: {
          classId: { in: scope.classIds },
          createdAt: { gte: sevenDaysAgo },
        },
        select: { id: true, title: true, titleAr: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Graded submissions — last 7d
      prisma.submission.findMany({
        where: {
          studentId: scope.studentId,
          gradedAt: { gte: sevenDaysAgo, not: null },
          grade: { not: null },
        },
        select: {
          id: true,
          grade: true,
          gradedAt: true,
          assignment: { select: { id: true, title: true, titleAr: true } },
        },
        orderBy: { gradedAt: "desc" },
        take: 10,
      }),
      // Exam attempts scored — last 7d
      prisma.examAttempt.findMany({
        where: {
          studentId: scope.studentId,
          submittedAt: { gte: sevenDaysAgo, not: null },
          totalScore: { not: null },
        },
        select: {
          id: true,
          totalScore: true,
          submittedAt: true,
        },
        orderBy: { submittedAt: "desc" },
        take: 10,
      }),
      // Pending invoices
      prisma.invoice.findMany({
        where: {
          studentId: scope.studentId,
          status: "PENDING",
        },
        select: { id: true, totalSar: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      // Upcoming class sessions within next 24h
      prisma.classSession.findMany({
        where: {
          classId: { in: scope.classIds },
          status: "SCHEDULED",
          scheduledDate: { gte: new Date(), lte: next24h },
        },
        select: {
          id: true,
          scheduledDate: true,
          class: { select: { name: true, nameAr: true } },
        },
        orderBy: { scheduledDate: "asc" },
        take: 5,
      }),
    ]);

  const items: ActivityItem[] = [];

  for (const a of newAssignments) {
    items.push({
      id: `asn-new-${a.id}`,
      type: "ASSIGNMENT_NEW",
      time: a.createdAt.toISOString(),
      href: "/student/assignments",
      data: { title: a.titleAr ?? a.title, titleEn: a.title },
    });
  }
  for (const s of gradedSubmissions) {
    items.push({
      id: `sub-${s.id}`,
      type: "ASSIGNMENT_GRADED",
      time: (s.gradedAt ?? new Date()).toISOString(),
      href: "/student/assignments",
      data: {
        title: s.assignment.titleAr ?? s.assignment.title,
        titleEn: s.assignment.title,
        score: Number(s.grade ?? 0),
      },
    });
  }
  for (const e of examResults) {
    items.push({
      id: `exam-${e.id}`,
      type: "EXAM_RESULT",
      time: (e.submittedAt ?? new Date()).toISOString(),
      href: `/student/exams/results/${e.id}`,
      data: { score: Math.round(Number(e.totalScore ?? 0)) },
    });
  }
  for (const inv of dueInvoices) {
    items.push({
      id: `inv-${inv.id}`,
      type: "INVOICE_DUE",
      time: inv.dueDate.toISOString(),
      href: "/student/billing",
      data: { amount: Number(inv.totalSar) },
    });
  }
  for (const cs of upcomingSessions) {
    items.push({
      id: `sess-${cs.id}`,
      type: "CLASS_REMINDER",
      time: cs.scheduledDate.toISOString(),
      href: "/student/classes",
      data: { class: cs.class.nameAr ?? cs.class.name, classEn: cs.class.name },
    });
  }

  items.sort((a, b) => (a.time < b.time ? 1 : -1));
  return NextResponse.json({ items: items.slice(0, 10) });
}
