/**
 * Monthly Parent Report — bilingual HTML document.
 * Mirrors the invoice-pdf.ts HTML-print pattern.
 * Output: Buffer (text/html) uploaded to the private `parent-reports` bucket.
 */
import { BRAND } from "@/lib/brand";

const C = BRAND.palette;

export interface ParentReportData {
  studentName: string;
  studentNameAr?: string | null;
  month: number; // 1-12
  year: number;
  attendanceRate: number;
  sessionsAttended: number;
  sessionsTotal: number;
  lessonsCompleted: number;
  homeworkCompleted: number;
  homeworkTotal: number;
  avgGrade?: number | null;
  teacherNotes?: string | null;
  levelBefore?: string | null;
  levelAfter?: string | null;
  paymentStatus: string; // PAID/PENDING/OVERDUE/UNKNOWN
  recordingUrls: string[];
  parentPortalUrl?: string;
  financeUrl?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MONTH_AR: Record<number, string> = {
  1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
  5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
  9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر",
};
const MONTH_EN: Record<number, string> = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December",
};

function paymentBadge(status: string): { ar: string; en: string; color: string } {
  const map: Record<string, { ar: string; en: string; color: string }> = {
    PAID: { ar: "مدفوع", en: "Paid", color: "#27AE60" },
    PENDING: { ar: "قيد الانتظار", en: "Pending", color: "#F39C12" },
    OVERDUE: { ar: "متأخر", en: "Overdue", color: "#E74C3C" },
    UNKNOWN: { ar: "غير محدد", en: "N/A", color: "#8A8580" },
  };
  return map[status] ?? map.UNKNOWN;
}

export function generateParentReportHtml(r: ParentReportData): Buffer {
  const pay = paymentBadge(r.paymentStatus);
  const homeworkPct =
    r.homeworkTotal > 0
      ? Math.round((r.homeworkCompleted / r.homeworkTotal) * 100)
      : 0;
  const recordingsHtml = r.recordingUrls.length
    ? r.recordingUrls
        .slice(0, 4)
        .map(
          (u, i) => `
        <a class="rec" href="${esc(u)}" target="_blank" rel="noopener">
          <div class="rec-thumb">▶</div>
          <div class="rec-meta">
            <div class="rec-title">جلسة ${i + 1} · Session ${i + 1}</div>
            <div class="rec-sub">شاهد التسجيل · Watch recording</div>
          </div>
        </a>`
        )
        .join("")
    : `<div class="empty">لا توجد تسجيلات لهذا الشهر · No recordings this month</div>`;

  return Buffer.from(
    `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>تقرير ${esc(r.studentNameAr || r.studentName)} — ${MONTH_AR[r.month]} ${r.year}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --navy: ${C.navy};
    --deep-navy: ${C.deepNavy};
    --ivory: ${C.ivory};
    --rose: ${C.rose};
    --mint: ${C.mint};
    --ink: ${C.deepNavy};
    --muted: ${C.textMuted};
    --line: ${C.border};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo','Inter',sans-serif;
    color: var(--ink);
    background: #f3f1ec;
    padding: 24px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(44,62,80,.08);
  }
  .head {
    background: linear-gradient(135deg, var(--deep-navy), var(--navy));
    color: #fff;
    padding: 32px;
  }
  .brand-mark {
    font-family: 'Inter',sans-serif;
    font-weight: 800;
    font-size: 24px;
    letter-spacing: .5px;
    margin-bottom: 8px;
  }
  .brand-mark sup { color: var(--rose); font-size: 13px; }
  .head h1 {
    font-size: 26px;
    font-weight: 700;
    margin-top: 6px;
  }
  .head h1 small {
    display:block;
    font-family: 'Inter',sans-serif;
    font-weight: 600;
    font-size: 14px;
    opacity: .75;
    margin-top: 4px;
  }
  .head .student {
    margin-top: 14px;
    background: rgba(255,255,255,.1);
    padding: 12px 16px;
    border-radius: 10px;
    display: inline-block;
  }
  .head .student .name-ar { font-size: 18px; font-weight: 700; }
  .head .student .name-en { font-size: 12px; opacity: .8; font-family: 'Inter',sans-serif; margin-top: 2px; }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 22px 32px;
    background: var(--ivory);
  }
  .stat {
    background: #fff;
    border-radius: 10px;
    padding: 14px 12px;
    text-align: center;
    border: 1px solid var(--line);
  }
  .stat .v {
    font-family: 'Inter',sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: var(--navy);
    line-height: 1;
  }
  .stat .u { font-size: 11px; color: var(--rose); font-weight: 700; margin-top: 4px; font-family:'Inter',sans-serif; }
  .stat .l {
    font-size: 11px;
    color: var(--muted);
    margin-top: 6px;
    line-height: 1.3;
  }
  .stat .l small { display:block; font-family:'Inter',sans-serif; opacity: .75; }

  .section {
    padding: 22px 32px;
    border-top: 1px solid var(--line);
  }
  .section h2 {
    font-size: 14px;
    color: var(--rose);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 12px;
    font-family: 'Inter',sans-serif;
  }
  .section h2 .ar { font-family: 'Cairo',sans-serif; margin-inline-end: 8px; color: var(--navy); }

  .notes-box {
    background: var(--ivory);
    border-inline-start: 4px solid var(--rose);
    padding: 14px 16px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.8;
    color: var(--ink);
  }
  .empty {
    color: var(--muted);
    font-size: 13px;
    padding: 12px;
    background: var(--ivory);
    border-radius: 8px;
  }

  .level-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .level-pill {
    background: var(--navy);
    color: #fff;
    padding: 10px 18px;
    border-radius: 999px;
    font-family: 'Inter',sans-serif;
    font-weight: 700;
    font-size: 14px;
  }
  .level-pill.after { background: var(--rose); }
  .level-arrow { font-size: 22px; color: var(--muted); }

  .recordings {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .rec {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--ivory);
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--line);
    text-decoration: none;
    color: var(--ink);
  }
  .rec-thumb {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: var(--navy);
    color: var(--mint);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .rec-title { font-size: 13px; font-weight: 600; }
  .rec-sub   { font-size: 11px; color: var(--muted); font-family:'Inter',sans-serif; }

  .payment-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 14px;
    background: var(--ivory);
    padding: 14px 18px;
    border-radius: 10px;
  }
  .pay-pill {
    padding: 6px 14px;
    border-radius: 999px;
    color: #fff;
    font-weight: 700;
    font-size: 12px;
  }
  .pay-cta {
    background: var(--rose);
    color: #fff;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  .foot {
    padding: 22px 32px 28px;
    border-top: 1px solid var(--line);
    font-size: 11px;
    color: var(--muted);
    line-height: 1.7;
    text-align: center;
  }
  .foot strong { color: var(--navy); }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand-mark">HAJR<sup>A°</sup></div>
      <h1>
        تقرير ولي الأمر الشهري
        <small>MONTHLY PARENT REPORT · ${esc(MONTH_EN[r.month])} ${r.year}</small>
      </h1>
      <div class="student">
        <div class="name-ar">${esc(r.studentNameAr || r.studentName)}</div>
        <div class="name-en">${esc(r.studentName)}</div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat">
        <div class="v">${r.attendanceRate.toFixed(0)}<span style="font-size:18px">%</span></div>
        <div class="u">Attendance</div>
        <div class="l">الحضور<small>${r.sessionsAttended} / ${r.sessionsTotal}</small></div>
      </div>
      <div class="stat">
        <div class="v">${r.lessonsCompleted}</div>
        <div class="u">Lessons</div>
        <div class="l">دروس مكتملة</div>
      </div>
      <div class="stat">
        <div class="v">${homeworkPct}<span style="font-size:18px">%</span></div>
        <div class="u">Homework</div>
        <div class="l">الواجبات<small>${r.homeworkCompleted} / ${r.homeworkTotal}</small></div>
      </div>
      <div class="stat">
        <div class="v">${r.avgGrade != null ? r.avgGrade.toFixed(0) : "—"}</div>
        <div class="u">Grade</div>
        <div class="l">المعدل</div>
      </div>
    </div>

    <div class="section">
      <h2><span class="ar">ملاحظات المعلم</span>Teacher Notes</h2>
      ${
        r.teacherNotes
          ? `<div class="notes-box">${esc(r.teacherNotes)}</div>`
          : `<div class="empty">لا توجد ملاحظات لهذا الشهر · No notes this month</div>`
      }
    </div>

    <div class="section">
      <h2><span class="ar">تطور المستوى</span>Level Progress</h2>
      <div class="level-row">
        <span class="level-pill">${esc(r.levelBefore || "—")}</span>
        <span class="level-arrow">←</span>
        <span class="level-pill after">${esc(r.levelAfter || r.levelBefore || "—")}</span>
      </div>
    </div>

    <div class="section">
      <h2><span class="ar">آخر التسجيلات</span>Recent Recordings</h2>
      <div class="recordings">${recordingsHtml}</div>
    </div>

    <div class="section">
      <h2><span class="ar">حالة الدفع</span>Payment Status</h2>
      <div class="payment-row">
        <span class="pay-pill" style="background:${pay.color}">${esc(pay.ar)} · ${esc(pay.en)}</span>
        ${
          r.financeUrl
            ? `<a class="pay-cta" href="${esc(r.financeUrl)}">المالية · Finance</a>`
            : ""
        }
      </div>
    </div>

    <div class="foot">
      <strong>HAJR A° English Academy</strong><br/>
      ${esc(BRAND.contact.email)} · ${esc(BRAND.site)}<br/>
      شكراً لاختياركم أكاديمية هجر · Thank you for choosing HAJR Academy.
    </div>
  </div>
</body>
</html>`,
    "utf-8"
  );
}
