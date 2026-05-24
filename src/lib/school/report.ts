/**
 * Partner-school report generation (Phase 9).
 *
 * Builds a combined attendance + progress + financial report for all
 * students enrolled at a partner school, and renders it as a
 * print-optimised bilingual HTML document (same approach as the Phase 8
 * invoice — Arabic renders correctly and converts cleanly to PDF).
 */

import { prisma } from "@/lib/prisma";
import { getSellerInfo } from "@/lib/finance/zatca";

export interface SchoolReportData {
  schoolNameAr: string;
  schoolNameEn: string;
  generatedAt: string;
  studentCount: number;
  attendance: { avgRate: number | null; sessionsTracked: number };
  progress: { byLevel: Record<string, number> };
  finance: { invoiced: number; paid: number; outstanding: number };
  students: {
    name: string;
    gradeLevel: string | null;
    attendanceRate: number | null;
  }[];
}

/** Gather the report data for a partner school. */
export async function buildSchoolReport(
  schoolId: string
): Promise<SchoolReportData | null> {
  const school = await prisma.partnerSchool.findUnique({
    where: { id: schoolId },
    include: {
      students: {
        include: {
          user: { select: { name: true, nameAr: true } },
        },
      },
    },
  });
  if (!school) return null;

  const studentIds = school.students.map((s) => s.id);

  // Attendance — overall rate across this school's students.
  const attendanceRecords =
    studentIds.length > 0
      ? await prisma.attendance.findMany({
          where: { studentId: { in: studentIds } },
          select: { status: true, studentId: true },
        })
      : [];
  const present = attendanceRecords.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE"
  ).length;
  const avgRate =
    attendanceRecords.length > 0
      ? Math.round((present / attendanceRecords.length) * 100)
      : null;

  // Per-student attendance rate.
  const perStudentRate = new Map<string, number | null>();
  for (const sid of studentIds) {
    const recs = attendanceRecords.filter((r) => r.studentId === sid);
    if (recs.length === 0) {
      perStudentRate.set(sid, null);
    } else {
      const p = recs.filter(
        (r) => r.status === "PRESENT" || r.status === "LATE"
      ).length;
      perStudentRate.set(sid, Math.round((p / recs.length) * 100));
    }
  }

  // Progress — CEFR level distribution.
  const skills =
    studentIds.length > 0
      ? await prisma.skillLevel.findMany({
          where: { studentId: { in: studentIds } },
          select: { currentLevel: true },
        })
      : [];
  const byLevel: Record<string, number> = {};
  for (const s of skills) {
    byLevel[s.currentLevel] = (byLevel[s.currentLevel] ?? 0) + 1;
  }

  // Finance — invoices for this school's students.
  const invoices =
    studentIds.length > 0
      ? await prisma.invoice.findMany({
          where: { studentId: { in: studentIds } },
          select: { totalSar: true, status: true },
        })
      : [];
  const invoiced = +invoices
    .reduce((s, i) => s + Number(i.totalSar), 0)
    .toFixed(2);
  const paid = +invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.totalSar), 0)
    .toFixed(2);

  return {
    schoolNameAr: school.nameAr,
    schoolNameEn: school.nameEn,
    generatedAt: new Date().toISOString(),
    studentCount: school.students.length,
    attendance: { avgRate, sessionsTracked: attendanceRecords.length },
    progress: { byLevel },
    finance: {
      invoiced,
      paid,
      outstanding: +(invoiced - paid).toFixed(2),
    },
    students: school.students.map((s) => ({
      name: s.user.nameAr ?? s.user.name,
      gradeLevel: s.gradeLevel,
      attendanceRate: perStudentRate.get(s.id) ?? null,
    })),
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
  }).format(n);
}

/** Render a school report as a print-optimised bilingual HTML document. */
export function renderSchoolReportHtml(data: SchoolReportData): Buffer {
  const seller = getSellerInfo();

  const studentRows = data.students
    .map(
      (s, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(s.name)}</td>
        <td>${esc(s.gradeLevel ?? "—")}</td>
        <td class="num">${s.attendanceRate != null ? s.attendanceRate + "%" : "—"}</td>
      </tr>`
    )
    .join("");

  const levelRows = Object.entries(data.progress.byLevel)
    .map(
      ([level, count]) =>
        `<span class="pill">${esc(level)}: <strong>${count}</strong></span>`
    )
    .join(" ");

  return Buffer.from(
    `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>School Report — ${esc(data.schoolNameEn)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo','Inter',sans-serif; color: #1E2A36; background: #f3f1ec; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(44,62,80,.08); }
  .head { background: #2C3E50; color: #fff; padding: 26px 32px; }
  .brand-mark { font-family: 'Inter',sans-serif; font-weight: 700; font-size: 24px; }
  .brand-mark sup { color: #B86E7B; font-size: 13px; }
  .head h1 { font-size: 18px; margin-top: 10px; }
  .head .sub { font-size: 12px; opacity: .75; font-family: 'Inter',sans-serif; }
  .meta { font-size: 11px; opacity: .7; margin-top: 8px; }
  .body { padding: 24px 32px; }
  .kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { background: #FAF6EE; border-radius: 8px; padding: 14px; }
  .kpi .label { font-size: 11px; color: #8A8580; }
  .kpi .value { font-size: 20px; font-weight: 700; color: #2C3E50; }
  h2 { font-size: 14px; color: #B86E7B; margin: 20px 0 10px; }
  .pill { display: inline-block; background: #B5E5D8; color: #16604a; border-radius: 999px; padding: 4px 12px; font-size: 12px; margin: 0 4px 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #2C3E50; color: #fff; font-size: 11px; padding: 8px; text-align: right; }
  tbody td { padding: 9px 8px; border-bottom: 1px solid #E8E5DF; font-size: 13px; text-align: right; }
  .num { font-family: 'Inter',sans-serif; }
  .foot { padding: 18px 32px; border-top: 1px solid #E8E5DF; font-size: 11px; color: #8A8580; }
  @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand-mark">HAJR<sup>A°</sup></div>
      <h1>تقرير المدرسة — ${esc(data.schoolNameAr)}</h1>
      <div class="sub">School Report — ${esc(data.schoolNameEn)}</div>
      <div class="meta">${esc(seller.sellerNameAr)} · ${data.generatedAt.slice(0, 10)}</div>
    </div>
    <div class="body">
      <div class="kpis">
        <div class="kpi"><div class="label">الطلاب · Students</div><div class="value num">${data.studentCount}</div></div>
        <div class="kpi"><div class="label">معدل الحضور · Attendance</div><div class="value num">${data.attendance.avgRate != null ? data.attendance.avgRate + "%" : "—"}</div></div>
        <div class="kpi"><div class="label">المحصّل · Paid (SAR)</div><div class="value num">${money(data.finance.paid)}</div></div>
      </div>

      <h2>المستويات · CEFR Levels</h2>
      <div>${levelRows || '<span class="pill">—</span>'}</div>

      <h2>الملخص المالي · Financial Summary</h2>
      <div class="kpis">
        <div class="kpi"><div class="label">إجمالي الفواتير · Invoiced</div><div class="value num">${money(data.finance.invoiced)}</div></div>
        <div class="kpi"><div class="label">المدفوع · Paid</div><div class="value num">${money(data.finance.paid)}</div></div>
        <div class="kpi"><div class="label">المتبقّي · Outstanding</div><div class="value num">${money(data.finance.outstanding)}</div></div>
      </div>

      <h2>الطلاب · Students</h2>
      <table>
        <thead>
          <tr><th style="width:36px">#</th><th>الاسم · Name</th><th>الصف · Grade</th><th>الحضور · Attendance</th></tr>
        </thead>
        <tbody>${studentRows || '<tr><td colspan="4" style="text-align:center;color:#8A8580">—</td></tr>'}</tbody>
      </table>
    </div>
    <div class="foot">
      <strong>HAJR A° English Academy</strong> — تقرير سرّي خاص بالمدرسة الشريكة · Confidential partner-school report.
    </div>
  </div>
</body>
</html>`,
    "utf-8"
  );
}
