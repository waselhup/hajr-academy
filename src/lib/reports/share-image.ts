/**
 * WhatsApp / social share image for monthly parent report.
 *
 * Returns HTML rendered at 1200×630 dimensions. Parents screenshot it,
 * or it's served from /api/og/parent-report/[id] for clients that fetch
 * og:image. Avoiding external rendering deps keeps the cron lightweight.
 */
import { BRAND } from "@/lib/brand";

const C = BRAND.palette;

export interface ShareImageData {
  studentName: string;
  studentNameAr?: string | null;
  month: number;
  year: number;
  attendanceRate: number;
  lessonsCompleted: number;
  level?: string | null;
}

const MONTH_AR: Record<number, string> = {
  1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
  5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
  9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateShareImageHtml(d: ShareImageData): Buffer {
  return Buffer.from(
    `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>تقرير ${esc(d.studentNameAr || d.studentName)} — ${MONTH_AR[d.month]} ${d.year}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Inter:wght@700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    font-family: 'Cairo','Inter',sans-serif;
    background: linear-gradient(135deg, ${C.deepNavy} 0%, ${C.navy} 100%);
    color: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .wrap {
    padding: 60px 80px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
  }
  .brand {
    font-family: 'Inter',sans-serif;
    font-weight: 800;
    font-size: 32px;
    letter-spacing: 1px;
  }
  .brand sup { color: ${C.rose}; font-size: 18px; }
  .glyph {
    position: absolute;
    right: 80px;
    top: 60px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: ${C.rose};
    opacity: .15;
  }
  .title {
    font-size: 64px;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .title small {
    display: block;
    color: ${C.mint};
    font-size: 28px;
    font-family: 'Inter',sans-serif;
    margin-top: 12px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    margin-top: 20px;
  }
  .tile {
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 16px;
    padding: 22px 24px;
    backdrop-filter: blur(8px);
  }
  .tile .v {
    font-family: 'Inter',sans-serif;
    font-weight: 800;
    font-size: 56px;
    color: ${C.mint};
    line-height: 1;
  }
  .tile .l {
    margin-top: 8px;
    font-size: 18px;
    color: rgba(255,255,255,.85);
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
  }
  .footer .rose { color: ${C.rose}; font-weight: 700; font-family: 'Inter',sans-serif; }
</style>
</head>
<body>
  <div class="wrap">
    <div>
      <div class="brand">HAJR<sup>A°</sup></div>
      <div class="glyph"></div>
    </div>

    <div>
      <div class="title">
        تقرير ${esc(d.studentNameAr || d.studentName)}
        <small>${MONTH_AR[d.month]} ${d.year} — Monthly Progress</small>
      </div>
      <div class="stats">
        <div class="tile">
          <div class="v">${d.attendanceRate.toFixed(0)}%</div>
          <div class="l">الحضور · Attendance</div>
        </div>
        <div class="tile">
          <div class="v">${d.lessonsCompleted}</div>
          <div class="l">الدروس · Lessons</div>
        </div>
        <div class="tile">
          <div class="v">${esc(d.level || "—")}</div>
          <div class="l">المستوى · Level</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>هجر أكاديمي · HAJR Academy</span>
      <span class="rose">${esc(BRAND.site.replace(/^https?:\/\//, ""))}</span>
    </div>
  </div>
</body>
</html>`,
    "utf-8"
  );
}
