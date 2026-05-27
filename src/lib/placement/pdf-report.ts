/**
 * Generates a bilingual placement test HTML report (rendered as PDF via
 * the browser print pipeline). Uploads to the private `placement-reports`
 * Supabase bucket and mints signed URLs (1y) for the student's download.
 */
import { createClient } from "@supabase/supabase-js";
import type { CefrLevel } from "@prisma/client";

const BUCKET = "placement-reports";
const C = {
  navy: "#1E2A36",
  charcoal: "#2C3E50",
  ivory: "#FAF6EE",
  rose: "#B86E7B",
  mint: "#B5E5D8",
  white: "#FFFFFF",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CEFR_DESC: Record<CefrLevel, { en: string; ar: string; color: string }> = {
  A1: { en: "Beginner", ar: "مبتدئ", color: "#94A3B8" },
  A2: { en: "Elementary", ar: "مبتدئ متقدم", color: "#64748B" },
  B1: { en: "Intermediate", ar: "متوسط", color: "#2563EB" },
  B2: { en: "Upper-Intermediate", ar: "متوسط متقدم", color: "#059669" },
  C1: { en: "Advanced", ar: "متقدم", color: "#B86E7B" },
  C2: { en: "Mastery", ar: "إتقان", color: "#1E2A36" },
};

export type ReportData = {
  attemptId: string;
  resultId: string;
  variantTitle: { en: string; ar: string };
  studentName: string;
  studentEmail: string | null;
  submittedAt: Date;
  cefrLevel: CefrLevel;
  score: number;
  maxScore: number;
  percent: number;
  sectionBreakdown: Array<{ titleEn: string; titleAr: string; score: number; max: number; percent: number }>;
  recommendations: Array<{ packageType: string; reasonEn: string; reasonAr: string; confidence: number }>;
};

export function renderPlacementReportHtml(d: ReportData): string {
  const lvl = CEFR_DESC[d.cefrLevel];
  const bars = d.sectionBreakdown
    .map(
      (s) => `
      <div class="row">
        <div class="row-label">
          <span class="ar">${esc(s.titleAr)}</span>
          <span class="en">${esc(s.titleEn)}</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${s.percent.toFixed(0)}%"></div></div>
        <div class="row-score">${s.score}/${s.max} (${s.percent.toFixed(0)}%)</div>
      </div>`
    )
    .join("");

  const recs = d.recommendations
    .map(
      (r) => `
      <li>
        <div class="rec-pkg">${esc(r.packageType)}</div>
        <div class="rec-ar">${esc(r.reasonAr)}</div>
        <div class="rec-en">${esc(r.reasonEn)}</div>
        <div class="rec-conf">Confidence: ${(r.confidence * 100).toFixed(0)}%</div>
      </li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>Placement Report — ${esc(d.studentName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "IBM Plex Sans Arabic", "Cairo", "Inter", sans-serif; margin: 0; padding: 0; background: ${C.ivory}; color: ${C.charcoal}; }
  .doc { max-width: 800px; margin: 0 auto; background: ${C.white}; }
  .hdr { background: ${C.navy}; color: ${C.white}; padding: 24px 32px; border-bottom: 4px solid ${C.rose}; }
  .hdr h1 { margin: 0; font-size: 28px; }
  .hdr .sub { color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 4px; }
  .meta { padding: 20px 32px; border-bottom: 1px solid #E2E8F0; }
  .meta-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
  .meta-row .lbl { color: #64748B; }
  .badge { padding: 32px; text-align: center; }
  .badge .cefr { display: inline-block; padding: 24px 48px; border-radius: 16px; background: ${lvl.color}; color: ${C.white}; font-size: 64px; font-weight: 800; letter-spacing: 0.05em; }
  .badge .cefr-desc { margin-top: 12px; font-size: 18px; color: ${C.charcoal}; }
  .score-row { padding: 0 32px 24px; text-align: center; font-size: 18px; }
  .score-row .big { font-size: 32px; font-weight: 800; color: ${C.navy}; }
  .sections { padding: 16px 32px 32px; }
  .sections h2 { font-size: 18px; color: ${C.navy}; margin: 0 0 12px; }
  .row { margin-bottom: 12px; }
  .row-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
  .row-label .en { color: #64748B; }
  .bar { height: 10px; background: #F1F5F9; border-radius: 5px; overflow: hidden; }
  .bar-fill { height: 100%; background: ${C.mint}; }
  .row-score { font-size: 12px; color: #64748B; margin-top: 4px; text-align: end; }
  .recs { padding: 16px 32px 24px; background: ${C.ivory}; }
  .recs h2 { font-size: 18px; color: ${C.navy}; margin: 0 0 16px; }
  .recs ul { list-style: none; padding: 0; margin: 0; }
  .recs li { background: ${C.white}; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; border-inline-start: 4px solid ${C.rose}; }
  .rec-pkg { font-weight: 700; color: ${C.navy}; font-size: 15px; margin-bottom: 4px; }
  .rec-ar { font-size: 14px; margin-bottom: 2px; }
  .rec-en { font-size: 13px; color: #64748B; }
  .rec-conf { font-size: 11px; color: ${C.rose}; margin-top: 4px; }
  .ftr { padding: 20px 32px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
</style>
</head>
<body>
<div class="doc">
  <div class="hdr">
    <h1>Hajr A° Academy — Placement Report</h1>
    <div class="sub">${esc(d.variantTitle.ar)} · ${esc(d.variantTitle.en)}</div>
  </div>
  <div class="meta">
    <div class="meta-row"><span class="lbl">الطالب · Student</span><span>${esc(d.studentName)}</span></div>
    ${d.studentEmail ? `<div class="meta-row"><span class="lbl">البريد · Email</span><span>${esc(d.studentEmail)}</span></div>` : ""}
    <div class="meta-row"><span class="lbl">التاريخ · Date</span><span>${d.submittedAt.toISOString().slice(0, 10)}</span></div>
  </div>
  <div class="badge">
    <div class="cefr">${d.cefrLevel}</div>
    <div class="cefr-desc">${esc(lvl.ar)} · ${esc(lvl.en)}</div>
  </div>
  <div class="score-row">
    <span class="big">${d.score} / ${d.maxScore}</span> &nbsp; (${d.percent.toFixed(1)}%)
  </div>
  <div class="sections">
    <h2>تفصيل الأقسام · Section breakdown</h2>
    ${bars}
  </div>
  <div class="recs">
    <h2>البرامج الموصى بها · Recommendations</h2>
    <ul>${recs}</ul>
  </div>
  <div class="ftr">
    Hajr A° English Academy · hajr.academy &nbsp;·&nbsp; report id: ${esc(d.resultId)}
  </div>
</div>
</body>
</html>`;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadPlacementReport(params: {
  resultId: string;
  body: Buffer;
}): Promise<{ ok: boolean; path?: string; error?: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "no-service-key" };
  }
  const path = `${new Date().getFullYear()}/${params.resultId}.html`;
  try {
    const supabase = serviceClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, params.body, {
      contentType: "text/html; charset=utf-8",
      upsert: true,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "upload failed" };
  }
}

export async function getPlacementReportSignedUrl(
  path: string,
  expiresInSeconds = 31536000 // 1 year
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const supabase = serviceClient();
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
