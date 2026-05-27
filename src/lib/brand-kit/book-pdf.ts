/**
 * HAJR A° Brand Book — multi-page print-optimised HTML document.
 * Mirrors invoice-pdf.ts pattern: returns a Buffer of self-contained
 * HTML that any modern browser can "Save as PDF" or that pdf tooling
 * (Chromium headless) renders 1:1. Embeds the logo as an inline SVG so
 * the document is fully portable.
 */
import { BRAND } from "@/lib/brand";

const C = BRAND.palette;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const LOGO_SVG = `<svg viewBox="0 0 240 80" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="58" font-family="Inter, sans-serif" font-weight="800" font-size="56" fill="${C.deepNavy}">HAJR</text>
  <text x="148" y="58" font-family="Inter, sans-serif" font-weight="800" font-size="56" fill="${C.rose}">A</text>
  <circle cx="220" cy="22" r="8" fill="${C.rose}"/>
</svg>`;

const LOGO_WHITE_SVG = `<svg viewBox="0 0 240 80" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="58" font-family="Inter, sans-serif" font-weight="800" font-size="56" fill="#FFFFFF">HAJR</text>
  <text x="148" y="58" font-family="Inter, sans-serif" font-weight="800" font-size="56" fill="${C.mint}">A</text>
  <circle cx="220" cy="22" r="8" fill="${C.mint}"/>
</svg>`;

const LOGO_MARK_SVG = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" rx="16" fill="${C.deepNavy}"/>
  <text x="22" y="55" font-family="Inter, sans-serif" font-weight="800" font-size="36" fill="#FFFFFF">A</text>
  <circle cx="58" cy="28" r="6" fill="${C.rose}"/>
</svg>`;

interface ColorSwatch {
  name: string;
  nameAr: string;
  hex: string;
  rgb: string;
  cmyk: string;
  usage: string;
  share: number;
}

const SWATCHES: ColorSwatch[] = [
  {
    name: "Deep Navy",
    nameAr: "كحلي عميق",
    hex: "#1E2A36",
    rgb: "30, 42, 54",
    cmyk: "44, 22, 0, 79",
    usage: "Primary text, headers, primary surfaces",
    share: 70,
  },
  {
    name: "Charcoal",
    nameAr: "فحمي",
    hex: "#2C3E50",
    rgb: "44, 62, 80",
    cmyk: "45, 23, 0, 69",
    usage: "Secondary text, subtle UI",
    share: 15,
  },
  {
    name: "Ivory",
    nameAr: "عاجي",
    hex: "#FAF6EE",
    rgb: "250, 246, 238",
    cmyk: "0, 2, 5, 2",
    usage: "Background, cards",
    share: 10,
  },
  {
    name: "Rose Mauve",
    nameAr: "وردي موف",
    hex: "#B86E7B",
    rgb: "184, 110, 123",
    cmyk: "0, 40, 33, 28",
    usage: "Accent, CTAs",
    share: 3,
  },
  {
    name: "Mint Frost",
    nameAr: "نعناع ضبابي",
    hex: "#B5E5D8",
    rgb: "181, 229, 216",
    cmyk: "21, 0, 6, 10",
    usage: "Highlight, success, soft borders",
    share: 2,
  },
];

function page(content: string): string {
  return `<section class="page">${content}</section>`;
}

export function generateBrandBookHtml(): Buffer {
  const today = new Date().toISOString().slice(0, 10);
  const html = `<!doctype html>
<html dir="ltr" lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(BRAND.name.en)} — Brand Book v3.0</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Inter', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif;
    color: ${C.deepNavy};
    background: ${C.ivory};
  }
  .page {
    width: 210mm; min-height: 297mm; padding: 24mm;
    page-break-after: always;
    position: relative;
    background: ${C.ivory};
  }
  .page:last-child { page-break-after: auto; }
  h1, h2, h3 { font-family: 'Inter', sans-serif; letter-spacing: -0.02em; margin: 0 0 8px; }
  h1 { font-size: 36pt; font-weight: 800; }
  h2 { font-size: 22pt; font-weight: 700; color: ${C.deepNavy}; }
  h3 { font-size: 14pt; font-weight: 600; color: ${C.navy}; }
  p, li { font-size: 11pt; line-height: 1.6; color: ${C.navy}; }
  .muted { color: ${C.textMuted}; }
  .small { font-size: 9pt; }
  .footer {
    position: absolute; bottom: 12mm; left: 24mm; right: 24mm;
    font-size: 8pt; color: ${C.textMuted};
    display: flex; justify-content: space-between;
    border-top: 1px solid ${C.border}; padding-top: 6mm;
  }

  /* Cover page */
  .cover {
    background: ${C.deepNavy}; color: #fff;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .cover h1 { color: #fff; font-size: 80pt; line-height: 1; }
  .cover .accent { color: ${C.rose}; }
  .cover .tagline { color: ${C.mint}; font-size: 18pt; font-weight: 500; margin-top: 8mm; }
  .cover .meta { color: ${C.mint}; font-size: 10pt; opacity: 0.8; }

  /* Color swatch grid */
  .swatch-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 8mm; }
  .swatch { border: 1px solid ${C.border}; border-radius: 4mm; overflow: hidden; }
  .swatch .chip { height: 30mm; }
  .swatch .body { padding: 4mm; background: #fff; }
  .swatch .name { font-weight: 700; font-size: 12pt; }
  .swatch .specs { font-family: 'Menlo', monospace; font-size: 9pt; color: ${C.textMuted}; margin-top: 2mm; }
  .usage-bar {
    display: flex; height: 8mm; border-radius: 2mm; overflow: hidden;
    margin: 8mm 0 4mm;
  }
  .usage-bar > div { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 8pt; font-weight: 600; }

  /* Logo system */
  .logo-card { background: #fff; border: 1px solid ${C.border}; border-radius: 4mm; padding: 8mm; text-align: center; margin-bottom: 6mm; }
  .logo-card.dark { background: ${C.deepNavy}; }
  .logo-card svg { max-width: 60mm; height: auto; }

  /* Typography sample */
  .type-sample h1 { font-size: 48pt; }
  .type-sample h2 { font-size: 32pt; }
  .type-sample h3 { font-size: 20pt; }
  .type-sample .body { font-size: 11pt; }
  .arabic-sample { direction: rtl; font-family: 'IBM Plex Sans Arabic', sans-serif; font-size: 14pt; line-height: 1.8; margin-top: 4mm; }

  /* Do/Don't grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .do, .dont { border-radius: 4mm; padding: 6mm; min-height: 50mm; }
  .do { background: #E8F7F1; border: 2px solid ${C.mint}; }
  .dont { background: #FCE9EC; border: 2px solid #E8A4AE; }
  .badge { display: inline-block; padding: 1mm 3mm; border-radius: 2mm; font-size: 9pt; font-weight: 700; margin-bottom: 3mm; }
  .badge.ok { background: ${C.mint}; color: ${C.deepNavy}; }
  .badge.no { background: ${C.rose}; color: #fff; }

  /* Social mockup */
  .mock { background: #fff; border: 1px solid ${C.border}; border-radius: 4mm; padding: 4mm; }
  .mock-twitter, .mock-ig, .mock-li { aspect-ratio: 16/9; background: ${C.deepNavy}; border-radius: 2mm; padding: 6mm; color: #fff; display: flex; align-items: center; justify-content: center; }
  .mock-ig { aspect-ratio: 1/1; background: linear-gradient(135deg, ${C.deepNavy} 0%, ${C.rose} 100%); }
  .mock-li { background: ${C.ivory}; color: ${C.deepNavy}; border: 1px solid ${C.border}; }

  .toc { list-style: none; padding: 0; }
  .toc li { padding: 3mm 0; border-bottom: 1px dotted ${C.border}; display: flex; justify-content: space-between; }
  .toc .num { font-weight: 700; color: ${C.rose}; }
</style>
</head>
<body>

  <!-- PAGE 1 — COVER -->
  ${page(`
    <div class="cover" style="padding:24mm;height:100%;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="font-size:11pt;color:${C.mint};margin-bottom:60mm;">BRAND BOOK · VERSION 3.0</div>
        <h1>HAJR <span class="accent">A°</span></h1>
        <div class="tagline">${esc(BRAND.tagline.en)} · ${esc(BRAND.tagline.ar)}</div>
      </div>
      <div class="meta">${esc(BRAND.contact.email)} · ${today}</div>
    </div>
  `)}

  <!-- PAGE 2 — ABOUT -->
  ${page(`
    <h2>About the brand</h2>
    <p class="muted">عن العلامة التجارية</p>
    <div style="margin-top:10mm;">
      <h3>Mission · المهمة</h3>
      <p>HAJR A° gives Saudi learners a calm, high-quality path to confident English — from beginner all the way through professional fluency. We pair human teachers with AI-assisted practice so progress is visible every week.</p>
      <p dir="rtl" lang="ar" style="font-family:'IBM Plex Sans Arabic',sans-serif;">
        نمنح المتعلمين السعوديين مساراً هادئاً وعالي الجودة لإتقان الإنجليزية بثقة — من المبتدئ حتى الطلاقة المهنية. نجمع المعلم البشري بالتدريب الذكي حتى يصبح التقدم ملموساً كل أسبوع.
      </p>
      <h3 style="margin-top:8mm;">Tagline · الشعار</h3>
      <p style="font-size:18pt;font-weight:700;color:${C.deepNavy};">"${esc(BRAND.tagline.en)}"</p>
      <p dir="rtl" style="font-size:18pt;font-weight:700;color:${C.rose};font-family:'IBM Plex Sans Arabic',sans-serif;">"${esc(BRAND.tagline.ar)}"</p>
    </div>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 2 / 10</span></div>
  `)}

  <!-- PAGE 3 — LOGO SYSTEM -->
  ${page(`
    <h2>Logo system</h2>
    <p class="muted">نظام الشعار — three variants for every surface.</p>
    <div class="grid-2" style="margin-top:6mm;">
      <div class="logo-card">
        <div style="font-size:9pt;margin-bottom:4mm;font-weight:700;">Primary · الأساسي</div>
        ${LOGO_SVG}
      </div>
      <div class="logo-card dark">
        <div style="font-size:9pt;margin-bottom:4mm;font-weight:700;color:#fff;">On dark · على خلفية داكنة</div>
        ${LOGO_WHITE_SVG}
      </div>
    </div>
    <div class="logo-card" style="margin-top:6mm;">
      <div style="font-size:9pt;margin-bottom:4mm;font-weight:700;">Mark only · العلامة فقط (app icon, favicon)</div>
      ${LOGO_MARK_SVG}
    </div>
    <h3 style="margin-top:8mm;">Clear space</h3>
    <p>Always keep an "A" worth of padding around the logo. Never crop, recolor, stretch, or rotate.</p>
    <h3>Minimum sizes</h3>
    <p>Primary mark: 24px tall on screen, 12mm tall in print. Mark only: 16px / 8mm.</p>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 3 / 10</span></div>
  `)}

  <!-- PAGE 4 — COLOR -->
  ${page(`
    <h2>Color palette</h2>
    <p class="muted">لوحة الألوان — five colors, fixed shares.</p>
    <div class="usage-bar">
      ${SWATCHES.map(
        (s) =>
          `<div style="flex:${s.share};background:${s.hex};color:${
            ["#1E2A36", "#2C3E50"].includes(s.hex) ? "#fff" : C.deepNavy
          };">${s.share}%</div>`
      ).join("")}
    </div>
    <div class="swatch-grid">
      ${SWATCHES.map(
        (s) => `
        <div class="swatch">
          <div class="chip" style="background:${s.hex};"></div>
          <div class="body">
            <div class="name">${esc(s.name)} · ${esc(s.nameAr)}</div>
            <div class="specs">HEX ${s.hex} · RGB ${s.rgb} · CMYK ${s.cmyk}</div>
            <div class="small muted" style="margin-top:2mm;">${esc(s.usage)}</div>
          </div>
        </div>`
      ).join("")}
    </div>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 4 / 10</span></div>
  `)}

  <!-- PAGE 5 — TYPOGRAPHY -->
  ${page(`
    <h2>Typography</h2>
    <p class="muted">Inter (Latin) · IBM Plex Sans Arabic (Arabic). Free, open, web-ready.</p>
    <div class="type-sample" style="margin-top:6mm;">
      <h1 style="margin-bottom:2mm;">Heading 1 · 48 / Bold</h1>
      <h2 style="margin-bottom:2mm;">Heading 2 · 32 / Semibold</h2>
      <h3 style="margin-bottom:2mm;">Heading 3 · 20 / Medium</h3>
      <div class="body">Body 11pt / Regular. The quick brown fox jumps over the lazy dog 0123456789.</div>
      <div class="arabic-sample">العنوان الرئيسي بالخط العربي — هجر A° أكاديمية اللغة الإنجليزية. 0123456789</div>
    </div>
    <h3 style="margin-top:10mm;">Where to download</h3>
    <p>Inter — fonts.google.com/specimen/Inter<br/>IBM Plex Sans Arabic — fonts.google.com/specimen/IBM+Plex+Sans+Arabic</p>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 5 / 10</span></div>
  `)}

  <!-- PAGE 6 — IMAGERY -->
  ${page(`
    <h2>Imagery & iconography</h2>
    <p class="muted">الصور والأيقونات</p>
    <h3 style="margin-top:6mm;">Photography</h3>
    <ul>
      <li>Warm, naturally lit, Saudi context preferred</li>
      <li>People-centric — show actual students/teachers when possible</li>
      <li>Avoid stocky stock — no handshakes-over-laptops, no cliché classroom shots</li>
      <li>Color tone aligned to Ivory + Deep Navy</li>
    </ul>
    <h3 style="margin-top:6mm;">Icons</h3>
    <ul>
      <li>Lucide icon set, 1.5px stroke, rounded</li>
      <li>Always semantic — pick the icon that means the thing, not the prettiest one</li>
      <li>Single-color tint: Deep Navy on light, Mint on dark, Rose for accents only</li>
    </ul>
    <h3 style="margin-top:6mm;">Don't</h3>
    <ul>
      <li>No gradients on icons</li>
      <li>No drop shadows under 3D shadows</li>
      <li>No "AI"-style hyperreal photos</li>
    </ul>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 6 / 10</span></div>
  `)}

  <!-- PAGE 7 — VOICE -->
  ${page(`
    <h2>Voice & tone</h2>
    <p class="muted">الصوت والنبرة</p>
    <h3 style="margin-top:6mm;">English voice</h3>
    <ul>
      <li><b>Calm, not loud.</b> No exclamation marks unless someone earned them.</li>
      <li><b>Clear, not clever.</b> Short sentences. Concrete nouns. Plain verbs.</li>
      <li><b>Warm, not casual.</b> We respect the learner's time and intelligence.</li>
      <li><b>Honest about progress.</b> We never say "fluent in 30 days."</li>
    </ul>
    <h3 dir="rtl" style="margin-top:6mm;font-family:'IBM Plex Sans Arabic',sans-serif;">النبرة العربية</h3>
    <ul dir="rtl" style="font-family:'IBM Plex Sans Arabic',sans-serif;">
      <li><b>هادئة لا صاخبة.</b> بدون مبالغة ولا علامات تعجب متكررة.</li>
      <li><b>واضحة لا متفلسفة.</b> جمل قصيرة وأفعال مباشرة.</li>
      <li><b>دافئة لا متكلّفة.</b> نحترم وقت المتعلّم وذكاءه.</li>
      <li><b>صادقة في الوعد.</b> لا نقول "الطلاقة في ٣٠ يوماً".</li>
    </ul>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 7 / 10</span></div>
  `)}

  <!-- PAGE 8 — DO / DON'T -->
  ${page(`
    <h2>Do / Don't · افعل / لا تفعل</h2>
    <div class="grid-2" style="margin-top:6mm;">
      <div class="do">
        <span class="badge ok">DO ✓</span>
        <ul style="margin:0;padding-inline-start:18px;">
          <li>Use the locked palette in the published 70/15/10/3/2 ratio.</li>
          <li>Pair Inter with IBM Plex Sans Arabic — together, never alone.</li>
          <li>Use Rose as an accent for actions and emotions, not blocks of text.</li>
          <li>Round corners 8–16px on cards, 24px on hero surfaces.</li>
        </ul>
      </div>
      <div class="dont">
        <span class="badge no">DON'T ✗</span>
        <ul style="margin:0;padding-inline-start:18px;">
          <li>No off-palette colors. No purple, no neon green, no off-brand teal.</li>
          <li>No drop shadows on logos. No outlines around the mark.</li>
          <li>No all-caps headlines longer than 3 words.</li>
          <li>No mixing fonts outside Inter + IBM Plex Sans Arabic.</li>
        </ul>
      </div>
    </div>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 8 / 10</span></div>
  `)}

  <!-- PAGE 9 — SOCIAL -->
  ${page(`
    <h2>Social media templates</h2>
    <p class="muted">قوالب التواصل الاجتماعي</p>
    <div class="grid-2" style="margin-top:6mm;">
      <div class="mock">
        <div style="font-weight:700;margin-bottom:3mm;">X / Twitter (1600×900)</div>
        <div class="mock-twitter">
          <div style="text-align:center;">
            <div style="font-size:18pt;font-weight:800;">HAJR A°</div>
            <div style="font-size:12pt;color:${C.mint};margin-top:4mm;">${esc(BRAND.tagline.en)}</div>
          </div>
        </div>
      </div>
      <div class="mock">
        <div style="font-weight:700;margin-bottom:3mm;">Instagram (1080×1080)</div>
        <div class="mock-ig">
          <div style="text-align:center;">
            <div style="font-size:22pt;font-weight:800;">HAJR A°</div>
          </div>
        </div>
      </div>
    </div>
    <div class="mock" style="margin-top:6mm;">
      <div style="font-weight:700;margin-bottom:3mm;">LinkedIn banner (1584×396)</div>
      <div class="mock-li">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
          <div>
            <div style="font-size:14pt;font-weight:800;">HAJR A° Academy</div>
            <div style="font-size:10pt;color:${C.textMuted};">${esc(BRAND.tagline.en)}</div>
          </div>
          <div style="color:${C.rose};font-size:24pt;font-weight:800;">A°</div>
        </div>
      </div>
    </div>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 9 / 10</span></div>
  `)}

  <!-- PAGE 10 — END -->
  ${page(`
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:200mm;text-align:center;">
      <div style="margin-bottom:8mm;">${LOGO_SVG}</div>
      <h2 style="font-size:24pt;">${esc(BRAND.name.en)}</h2>
      <p dir="rtl" style="font-family:'IBM Plex Sans Arabic',sans-serif;font-size:14pt;color:${C.rose};">
        ${esc(BRAND.name.ar)}
      </p>
      <p class="muted" style="margin-top:10mm;">Version 3.0 · ${today}</p>
      <p class="small muted">Brand questions? ${esc(BRAND.contact.email)}</p>
    </div>
    <div class="footer"><span>Hajr A° Brand Book v3.0</span><span>Page 10 / 10</span></div>
  `)}

</body>
</html>`;
  return Buffer.from(html, "utf8");
}
