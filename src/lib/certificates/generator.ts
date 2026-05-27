/**
 * Government-style certificate of achievement.
 * HTML → Buffer pattern (same as invoice-pdf), uploaded to the public
 * `certificates` bucket so /verify/[code] can render the QR target without
 * auth. Embeds a QR code (data URL) pointing at /verify/{verificationCode}.
 */
import QRCode from "qrcode";
import { BRAND } from "@/lib/brand";
import type { CertificateType } from "@prisma/client";

const C = BRAND.palette;

export interface CertificateDocData {
  type: CertificateType;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  studentName: string;
  studentNameAr?: string | null;
  issueDate: Date;
  expiryDate?: Date | null;
  cefrLevel?: string | null;
  score?: number | null;
  verificationCode: string;
  verifyUrl: string;
  directorName?: string;
  teacherName?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TYPE_LABEL_AR: Record<CertificateType, string> = {
  LEVEL_COMPLETION: "إتمام مستوى",
  COURSE_COMPLETION: "إتمام دورة",
  PLACEMENT: "تحديد مستوى",
  ATTENDANCE: "حضور",
  SPEAKING_CLUB: "نادي محادثة",
};
const TYPE_LABEL_EN: Record<CertificateType, string> = {
  LEVEL_COMPLETION: "Level Completion",
  COURSE_COMPLETION: "Course Completion",
  PLACEMENT: "Placement",
  ATTENDANCE: "Attendance",
  SPEAKING_CLUB: "Speaking Club",
};

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function generateCertificateHtml(
  c: CertificateDocData
): Promise<{ html: Buffer; qrDataUrl: string }> {
  const qrDataUrl = await QRCode.toDataURL(c.verifyUrl, {
    width: 240,
    margin: 1,
    color: { dark: C.deepNavy, light: "#FFFFFF" },
  });

  const html = Buffer.from(
    `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${esc(c.titleEn)} — ${esc(c.studentName)} — HAJR Academy</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Playfair+Display:wght@700;900&family=Inter:wght@500;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --navy: ${C.navy};
    --deep-navy: ${C.deepNavy};
    --ivory: ${C.ivory};
    --rose: ${C.rose};
    --mint: ${C.mint};
    --ink: ${C.deepNavy};
    --muted: ${C.textMuted};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo','Inter',sans-serif;
    background: #f3f1ec;
    padding: 32px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    max-width: 920px;
    margin: 0 auto;
    background: #fff;
    padding: 8px;
    border: 8px solid var(--deep-navy);
    box-shadow: 0 12px 60px rgba(44,62,80,.15);
  }
  .inner {
    border: 2px solid var(--rose);
    padding: 56px 56px 40px;
    position: relative;
  }
  .corner {
    position: absolute;
    width: 60px;
    height: 60px;
    border: 3px solid var(--rose);
  }
  .corner.tl { top: 16px; right: 16px; border-bottom: 0; border-left: 0; }
  .corner.tr { top: 16px; left: 16px; border-bottom: 0; border-right: 0; }
  .corner.bl { bottom: 16px; right: 16px; border-top: 0; border-left: 0; }
  .corner.br { bottom: 16px; left: 16px; border-top: 0; border-right: 0; }

  .brand-row { text-align: center; }
  .brand-mark {
    font-family: 'Inter',sans-serif;
    font-weight: 900;
    color: var(--deep-navy);
    font-size: 44px;
    letter-spacing: 2px;
  }
  .brand-mark sup { color: var(--rose); font-size: 20px; }
  .brand-sub {
    margin-top: 4px;
    color: var(--muted);
    font-size: 14px;
    font-family: 'Inter',sans-serif;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .divider {
    width: 220px;
    height: 4px;
    background: var(--rose);
    margin: 24px auto;
    border-radius: 2px;
  }

  h1 {
    text-align: center;
    color: var(--deep-navy);
    font-family: 'Playfair Display','Cairo',serif;
    font-weight: 900;
    font-size: 44px;
    margin-bottom: 8px;
  }
  h1 small {
    display: block;
    font-family: 'Cairo',serif;
    font-size: 24px;
    color: var(--rose);
    margin-top: 8px;
    font-weight: 700;
  }

  .awarded-to {
    margin-top: 28px;
    text-align: center;
    color: var(--muted);
    font-size: 16px;
    letter-spacing: 1px;
    font-family: 'Inter',sans-serif;
  }

  .student-name {
    margin-top: 12px;
    text-align: center;
    font-family: 'Playfair Display','Cairo',serif;
    font-weight: 900;
    color: var(--deep-navy);
    font-size: 56px;
    line-height: 1.1;
  }
  .student-name-ar {
    text-align: center;
    font-family: 'Cairo',sans-serif;
    color: var(--navy);
    font-size: 26px;
    font-weight: 700;
    margin-top: 4px;
  }

  .body-text {
    margin-top: 24px;
    text-align: center;
    font-size: 16px;
    color: var(--ink);
    line-height: 1.8;
    max-width: 640px;
    margin-inline: auto;
  }
  .body-text strong { color: var(--rose); }

  .meta-grid {
    margin-top: 32px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    border-top: 1px solid #e8e3d8;
    border-bottom: 1px solid #e8e3d8;
    padding: 18px 0;
  }
  .meta {
    text-align: center;
  }
  .meta .k {
    font-family: 'Inter',sans-serif;
    font-size: 11px;
    color: var(--rose);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }
  .meta .v {
    font-family: 'Inter',sans-serif;
    color: var(--deep-navy);
    font-weight: 700;
    font-size: 16px;
    margin-top: 4px;
  }

  .sig-row {
    margin-top: 40px;
    display: grid;
    grid-template-columns: 1fr 240px 1fr;
    align-items: end;
    gap: 24px;
  }
  .sig {
    text-align: center;
  }
  .sig .line {
    border-top: 2px solid var(--deep-navy);
    padding-top: 6px;
    font-size: 12px;
    color: var(--muted);
    font-family: 'Inter',sans-serif;
    margin-inline: 16px;
  }
  .sig .name {
    font-size: 14px;
    font-weight: 700;
    color: var(--deep-navy);
  }
  .qr-box { text-align: center; }
  .qr-box img {
    width: 140px; height: 140px;
    background: #fff; padding: 6px; border: 1px solid #e8e3d8; border-radius: 8px;
  }
  .qr-code {
    margin-top: 6px;
    font-family: 'Inter',sans-serif;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 1px;
  }
  .qr-label {
    font-family: 'Inter',sans-serif;
    font-size: 11px;
    color: var(--rose);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="inner">
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>

      <div class="brand-row">
        <div class="brand-mark">HAJR<sup>A°</sup></div>
        <div class="brand-sub">${esc(BRAND.name.en)}</div>
      </div>

      <div class="divider"></div>

      <h1>
        Certificate of Achievement
        <small>شهادة إنجاز</small>
      </h1>

      <div class="awarded-to">— Proudly awarded to · تُمنح بفخر إلى —</div>

      <div class="student-name">${esc(c.studentName)}</div>
      ${
        c.studentNameAr
          ? `<div class="student-name-ar">${esc(c.studentNameAr)}</div>`
          : ""
      }

      <div class="body-text">
        For successfully completing <strong>${esc(c.titleEn)}</strong>
        · لإتمامه <strong>${esc(c.titleAr)}</strong>.
        ${
          c.descriptionEn
            ? `<br/><br/>${esc(c.descriptionEn)}${c.descriptionAr ? ` · ${esc(c.descriptionAr)}` : ""}`
            : ""
        }
      </div>

      <div class="meta-grid">
        <div class="meta">
          <div class="k">Type · النوع</div>
          <div class="v">${TYPE_LABEL_EN[c.type]} · ${TYPE_LABEL_AR[c.type]}</div>
        </div>
        <div class="meta">
          <div class="k">Issue date · تاريخ الإصدار</div>
          <div class="v">${fmtDate(c.issueDate)}</div>
        </div>
        <div class="meta">
          <div class="k">${c.cefrLevel ? "Level · المستوى" : c.score != null ? "Score · النتيجة" : "Validity · الصلاحية"}</div>
          <div class="v">${
            c.cefrLevel
              ? esc(c.cefrLevel)
              : c.score != null
              ? `${c.score}/100`
              : c.expiryDate
              ? fmtDate(c.expiryDate)
              : "Permanent · دائمة"
          }</div>
        </div>
      </div>

      <div class="sig-row">
        <div class="sig">
          <div class="name">${esc(c.directorName || "Academy Director")}</div>
          <div class="line">Academy Director · مدير الأكاديمية</div>
        </div>
        <div class="qr-box">
          <div class="qr-label">Verify · تحقق</div>
          <img src="${qrDataUrl}" alt="Verification QR" />
          <div class="qr-code">${esc(c.verificationCode)}</div>
        </div>
        <div class="sig">
          <div class="name">${esc(c.teacherName || "Lead Teacher")}</div>
          <div class="line">Lead Teacher · المعلم الأول</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
    "utf-8"
  );

  return { html, qrDataUrl };
}

/** 12-char URL-safe verification code. */
export function newVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}
