/**
 * Compute + generate a monthly parent report for a single student.
 * Idempotent on (studentId, year, month) thanks to upsert.
 *
 * Used by:
 *   - /api/cron/monthly-reports (system run)
 *   - /api/admin/parent-reports/[studentId]/regenerate (manual)
 */
import { prisma } from "@/lib/prisma";
import { generateParentReportHtml } from "./parent-report-pdf";
import { generateShareImageHtml } from "./share-image";
import {
  uploadToBucket,
  getSignedUrl,
  getPublicUrl,
} from "@/lib/storage/sprint4-storage";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";

export interface MonthlyReportInput {
  studentId: string;
  year: number;
  month: number; // 1-12
  generatedById: string; // user id or "system"
}

export interface MonthlyReportResult {
  ok: boolean;
  reportId?: string;
  pdfUrl?: string | null;
  shareImageUrl?: string | null;
  error?: string;
}

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

function levelLabelFromEnglishLevel(lvl: string | null | undefined): string | null {
  if (!lvl) return null;
  const map: Record<string, string> = {
    BEGINNER: "A1",
    INTERMEDIATE: "B1",
    ADVANCED: "C1",
  };
  return map[lvl] ?? lvl;
}

export async function generateMonthlyReport(
  input: MonthlyReportInput
): Promise<MonthlyReportResult> {
  const { studentId, year, month, generatedById } = input;
  const { start, end } = monthBounds(year, month);

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { user: true, parentLinks: { include: { parent: { include: { user: true } } } } },
  });
  if (!student) return { ok: false, error: "student-not-found" };

  // Attendance from sessions of this student's enrolled classes — count via
  // Attendance + ClassSession joins. We approximate sessionsTotal using
  // unique ClassSession.scheduledDate rows within the month for classes the
  // student is enrolled in.
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { classId: true },
  });
  const classIds = enrollments.map((e) => e.classId);

  const sessions = classIds.length
    ? await prisma.classSession.findMany({
        where: {
          classId: { in: classIds },
          scheduledDate: { gte: start, lt: end },
        },
        select: {
          id: true,
          scheduledDate: true,
          notes: true,
          zoomRecordingUrl: true,
        },
        orderBy: { scheduledDate: "desc" },
      })
    : [];
  const sessionsTotal = sessions.length;

  const attendances = sessions.length
    ? await prisma.attendance.findMany({
        where: {
          sessionId: { in: sessions.map((s) => s.id) },
          studentId,
        },
        select: { status: true },
      })
    : [];
  const sessionsAttended = attendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const attendanceRate =
    sessionsTotal > 0 ? (sessionsAttended / sessionsTotal) * 100 : 0;

  // Recordings — up to 4 most recent
  const recordingUrls = sessions
    .map((s) => s.zoomRecordingUrl)
    .filter((u): u is string => !!u)
    .slice(0, 4);

  // Aggregate teacher notes from session.notes
  const teacherNotes = sessions
    .map((s) => s.notes?.trim())
    .filter((n): n is string => !!n && n.length > 0)
    .join("\n\n")
    .slice(0, 1500) || null;

  // Lessons completed — count of attended sessions (proxy).
  const lessonsCompleted = sessionsAttended;

  // Homework — assignments due in window + student's submissions
  const assignments = classIds.length
    ? await prisma.assignment.findMany({
        where: {
          classId: { in: classIds },
          OR: [
            { dueDate: { gte: start, lt: end } },
            { createdAt: { gte: start, lt: end } },
          ],
        },
        select: { id: true },
      })
    : [];
  const homeworkTotal = assignments.length;
  const submissions = assignments.length
    ? await prisma.submission.findMany({
        where: {
          assignmentId: { in: assignments.map((a) => a.id) },
          studentId,
        },
        select: { grade: true },
      })
    : [];
  const homeworkCompleted = submissions.length;
  const grades = submissions.map((s) => s.grade).filter((g): g is number => g != null);
  const avgGrade =
    grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : null;

  // Payment status — most recent invoice covering this month
  const inv = await prisma.invoice.findFirst({
    where: { studentId, year, month },
    orderBy: { createdAt: "desc" },
    select: { invoiceStatus: true, status: true },
  });
  const paymentStatus = inv?.invoiceStatus ?? inv?.status ?? "UNKNOWN";

  const levelAfter = levelLabelFromEnglishLevel(student.englishLevel);

  // Upsert ParentReport
  const primaryParent = student.parentLinks.find((l) => l.isPrimary) ?? student.parentLinks[0];
  const parentId = primaryParent?.parentId ?? null;
  const parentUserId = primaryParent?.parent.user.id ?? null;
  const parentEmail = primaryParent?.parent.user.email ?? null;

  // Pull prior month's level for "before"
  const priorMonthEnd = new Date(start.getTime() - 1);
  const priorReport = await prisma.parentReport.findFirst({
    where: { studentId, year: priorMonthEnd.getUTCFullYear(), month: priorMonthEnd.getUTCMonth() + 1 },
    select: { levelAfter: true },
  });
  const levelBefore = priorReport?.levelAfter ?? levelAfter;

  const report = await prisma.parentReport.upsert({
    where: {
      studentId_year_month: { studentId, year, month },
    },
    create: {
      studentId,
      parentId,
      year,
      month,
      attendanceRate,
      sessionsAttended,
      sessionsTotal,
      lessonsCompleted,
      homeworkCompleted,
      homeworkTotal,
      avgGrade,
      teacherNotes,
      levelBefore,
      levelAfter,
      paymentStatus,
      recordingUrls,
      generatedById,
    },
    update: {
      parentId,
      attendanceRate,
      sessionsAttended,
      sessionsTotal,
      lessonsCompleted,
      homeworkCompleted,
      homeworkTotal,
      avgGrade,
      teacherNotes,
      levelBefore,
      levelAfter,
      paymentStatus,
      recordingUrls,
    },
  });

  // Generate PDF + share image
  const studentName = student.user.name;
  const studentNameAr = student.user.nameAr;

  const pdfBuf = generateParentReportHtml({
    studentName,
    studentNameAr,
    month,
    year,
    attendanceRate,
    sessionsAttended,
    sessionsTotal,
    lessonsCompleted,
    homeworkCompleted,
    homeworkTotal,
    avgGrade,
    teacherNotes,
    levelBefore,
    levelAfter,
    paymentStatus,
    recordingUrls,
    financeUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/ar/parent/finance`,
  });

  const shareBuf = generateShareImageHtml({
    studentName,
    studentNameAr,
    month,
    year,
    attendanceRate,
    lessonsCompleted,
    level: levelAfter,
  });

  const pdfPath = `${year}/${String(month).padStart(2, "0")}/${studentId}.html`;
  const sharePath = `parent-reports/${year}/${String(month).padStart(2, "0")}/${studentId}.html`;

  const pdfUp = await uploadToBucket({
    bucket: "parent-reports",
    path: pdfPath,
    body: pdfBuf,
    contentType: "text/html; charset=utf-8",
  });
  const shareUp = await uploadToBucket({
    bucket: "share-images",
    path: sharePath,
    body: shareBuf,
    contentType: "text/html; charset=utf-8",
  });

  const pdfUrl = pdfUp.ok ? await getSignedUrl("parent-reports", pdfPath) : null;
  const shareImageUrl = shareUp.ok ? getPublicUrl("share-images", sharePath) : null;

  await prisma.parentReport.update({
    where: { id: report.id },
    data: {
      pdfUrl,
      pdfPath: pdfUp.ok ? pdfPath : null,
      shareImageUrl,
      shareImagePath: shareUp.ok ? sharePath : null,
    },
  });

  // Notify parent
  if (parentUserId) {
    try {
      await notify({
        userId: parentUserId,
        type: "PARENT_REPORT_READY",
        title: `Monthly report for ${studentName} is ready`,
        titleAr: `تقرير ${studentNameAr || studentName} الشهري جاهز`,
        body: `Your monthly report for ${studentName} (${year}/${String(month).padStart(2, "0")}) is ready.`,
        bodyAr: `تقرير ${studentNameAr || studentName} الشهري لـ ${year}/${String(month).padStart(2, "0")} جاهز للعرض.`,
        channels: ["inApp", "email"],
        actionUrl: `/ar/parent/reports/${report.id}`,
        actionLabel: "View report",
        actionLabelAr: "عرض التقرير",
        priority: "NORMAL",
        refType: "ParentReport",
        refId: report.id,
      });
      await prisma.parentReport.update({
        where: { id: report.id },
        data: { emailedAt: new Date(), emailedTo: parentEmail },
      });
    } catch (e) {
      console.error("[monthly-report] notify failed:", e);
    }
  }

  await audit.mutation(generatedById, "PARENT_REPORT_GENERATED", "ParentReport", report.id, {
    studentId,
    year,
    month,
  });

  return {
    ok: true,
    reportId: report.id,
    pdfUrl,
    shareImageUrl,
  };
}
