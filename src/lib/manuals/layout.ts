/**
 * Shared HTML print shell for the role-based user manuals.
 * Mirrors src/lib/brand-kit/book-pdf.ts: returns a self-contained
 * HTML string that any browser can "Save as PDF". Each manual is
 * single-language (AR or EN) — we build six PDFs total.
 */
import { BRAND } from "@/lib/brand";

const C = BRAND.palette;

export type Lang = "ar" | "en";

export interface ManualSection {
  title: string;
  body: string;
  screenshot?: string;
  tip?: string;
  warning?: string;
}

export interface ManualChapter {
  number: number;
  title: string;
  sections: ManualSection[];
}

export interface ManualAppendix {
  title: string;
  body: string;
}

export interface ManualDoc {
  role: "admin" | "teacher" | "student";
  lang: Lang;
  cover: {
    eyebrow: string;
    title: string;
    subtitle: string;
    version: string;
  };
  toc: { num: string; title: string; page: number }[];
  chapters: ManualChapter[];
  appendix: ManualAppendix[];
}

export function esc(s: string): string {
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

function page(content: string): string {
  return `<section class="page">${content}</section>`;
}

function placeholderImg(label: string): string {
  return `<div class="screenshot-placeholder">
    <div class="placeholder-frame">
      <div class="placeholder-label">${esc(label)}</div>
      <div class="placeholder-sub">Screenshot will be captured here</div>
    </div>
  </div>`;
}

function screenshotBlock(path: string | undefined, label: string): string {
  if (!path) return "";
  return `<figure class="screenshot">
    <img src="${esc(path)}" alt="${esc(label)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"/>
    <div class="screenshot-fallback" style="display:none;">${placeholderImg(label)}</div>
    <figcaption>${esc(label)}</figcaption>
  </figure>`;
}

function renderSection(section: ManualSection, lang: Lang): string {
  const tipLabel = lang === "ar" ? "نصيحة" : "Tip";
  const warnLabel = lang === "ar" ? "تنبيه" : "Warning";
  return `<div class="section">
    <h3>${esc(section.title)}</h3>
    <div class="section-body">${section.body}</div>
    ${section.screenshot ? screenshotBlock(section.screenshot, section.title) : ""}
    ${section.tip ? `<div class="tip"><span class="tip-label">${tipLabel}</span><div>${section.tip}</div></div>` : ""}
    ${section.warning ? `<div class="warn"><span class="warn-label">${warnLabel}</span><div>${section.warning}</div></div>` : ""}
  </div>`;
}

function renderCover(doc: ManualDoc): string {
  const today = new Date().toISOString().slice(0, 10);
  return page(`
    <div class="cover" style="padding:24mm;height:100%;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="font-size:11pt;color:${C.mint};margin-bottom:8mm;letter-spacing:0.2em;">${esc(doc.cover.eyebrow)}</div>
        <div style="margin-bottom:40mm;">${LOGO_WHITE_SVG}</div>
        <h1>${esc(doc.cover.title)}</h1>
        <div class="tagline">${esc(doc.cover.subtitle)}</div>
      </div>
      <div class="meta">${esc(doc.cover.version)} · ${today} · hello@hajracademy.sa</div>
    </div>
  `);
}

function renderToc(doc: ManualDoc, lang: Lang): string {
  const heading = lang === "ar" ? "المحتويات" : "Contents";
  return page(`
    <div class="toc-page">
      <h2>${heading}</h2>
      <ol class="toc">
        ${doc.toc
          .map(
            (item) =>
              `<li><span class="num">${esc(item.num)}</span><span class="toc-title">${esc(item.title)}</span><span class="dots"></span><span class="page-num">${item.page}</span></li>`
          )
          .join("")}
      </ol>
    </div>
  `);
}

function renderChapter(chapter: ManualChapter, lang: Lang, pageNum: number, totalPages: number): string {
  const chapterLabel = lang === "ar" ? `الفصل ${chapter.number}` : `Chapter ${chapter.number}`;
  return page(`
    <div class="chapter-header">
      <div class="chapter-num">${esc(chapterLabel)}</div>
      <h2>${esc(chapter.title)}</h2>
    </div>
    ${chapter.sections.map((s) => renderSection(s, lang)).join("")}
    <div class="footer"><span>HAJR A° · ${lang === "ar" ? "دليل الاستخدام" : "User Manual"}</span><span>${pageNum} / ${totalPages}</span></div>
  `);
}

function renderAppendix(items: ManualAppendix[], lang: Lang, pageNum: number, totalPages: number): string {
  const heading = lang === "ar" ? "ملحق" : "Appendix";
  return page(`
    <h2>${esc(heading)}</h2>
    ${items
      .map(
        (item) => `
        <div class="appendix-item">
          <h3>${esc(item.title)}</h3>
          <div>${item.body}</div>
        </div>`
      )
      .join("")}
    <div class="footer"><span>HAJR A° · ${lang === "ar" ? "دليل الاستخدام" : "User Manual"}</span><span>${pageNum} / ${totalPages}</span></div>
  `);
}

export function renderManualHtml(doc: ManualDoc): string {
  const dir = doc.lang === "ar" ? "rtl" : "ltr";
  const totalPages = 2 + doc.chapters.length + (doc.appendix.length > 0 ? 1 : 0);

  const chaptersHtml = doc.chapters
    .map((ch, idx) => renderChapter(ch, doc.lang, idx + 3, totalPages))
    .join("");
  const appendixHtml =
    doc.appendix.length > 0
      ? renderAppendix(doc.appendix, doc.lang, totalPages, totalPages)
      : "";

  return `<!doctype html>
<html dir="${dir}" lang="${doc.lang}">
<head>
<meta charset="utf-8"/>
<title>${esc(doc.cover.title)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: ${doc.lang === "ar" ? "'IBM Plex Sans Arabic'," : ""} 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: ${C.deepNavy};
    background: ${C.ivory};
    direction: ${dir};
  }
  .page {
    width: 210mm; min-height: 297mm; padding: 24mm;
    page-break-after: always;
    position: relative;
    background: ${C.ivory};
  }
  .page:last-child { page-break-after: auto; }
  h1, h2, h3 { margin: 0 0 8px; letter-spacing: -0.01em; }
  h1 { font-size: 48pt; font-weight: 800; line-height: 1.1; }
  h2 { font-size: 26pt; font-weight: 700; color: ${C.deepNavy}; margin-bottom: 6mm; }
  h3 { font-size: 14pt; font-weight: 600; color: ${C.navy}; margin-top: 6mm; }
  p, li { font-size: 11pt; line-height: 1.65; color: ${C.navy}; margin: 0 0 4mm; }
  ul, ol { margin: 0 0 4mm; padding-${doc.lang === "ar" ? "right" : "left"}: 6mm; }
  strong, b { color: ${C.deepNavy}; }
  .footer {
    position: absolute; bottom: 12mm; left: 24mm; right: 24mm;
    font-size: 8pt; color: ${C.textMuted};
    display: flex; justify-content: space-between;
    border-top: 1px solid ${C.border}; padding-top: 4mm;
  }

  /* Cover */
  .cover {
    background: ${C.deepNavy}; color: #fff;
  }
  .cover h1 { color: #fff; font-size: 64pt; line-height: 1.05; }
  .cover .tagline { color: ${C.mint}; font-size: 18pt; font-weight: 500; margin-top: 6mm; }
  .cover .meta { color: ${C.mint}; font-size: 10pt; opacity: 0.8; }

  /* TOC */
  .toc-page h2 { margin-bottom: 10mm; }
  .toc { list-style: none; padding: 0; margin: 0; }
  .toc li {
    padding: 3mm 0;
    border-bottom: 1px dotted ${C.border};
    display: flex; align-items: baseline; gap: 4mm;
    font-size: 11pt;
  }
  .toc .num { font-weight: 700; color: ${C.rose}; min-width: 16mm; }
  .toc .toc-title { color: ${C.deepNavy}; }
  .toc .dots { flex: 1; border-bottom: 1px dotted ${C.border}; transform: translateY(-2pt); }
  .toc .page-num { font-weight: 600; color: ${C.navy}; min-width: 8mm; text-align: ${doc.lang === "ar" ? "left" : "right"}; }

  /* Chapter */
  .chapter-header {
    border-bottom: 3px solid ${C.rose};
    padding-bottom: 4mm; margin-bottom: 6mm;
  }
  .chapter-num {
    color: ${C.rose}; font-weight: 700; font-size: 10pt;
    letter-spacing: 0.2em; text-transform: uppercase;
    margin-bottom: 2mm;
  }
  .section { margin-bottom: 8mm; }
  .section-body p { margin: 0 0 3mm; }
  .section ul, .section ol { margin: 2mm 0 4mm; padding-${doc.lang === "ar" ? "right" : "left"}: 6mm; }
  .section li { margin-bottom: 2mm; }
  .section code, .section .kbd {
    background: ${C.surface}; border: 1px solid ${C.border};
    padding: 0.5mm 2mm; border-radius: 2mm;
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 10pt;
  }

  /* Tip & warn */
  .tip, .warn {
    border-radius: 3mm; padding: 4mm 5mm; margin: 4mm 0;
    display: flex; gap: 4mm; align-items: flex-start;
    font-size: 10pt;
  }
  .tip { background: #E8F7F1; border-${doc.lang === "ar" ? "right" : "left"}: 3px solid ${C.mint}; }
  .warn { background: #FCE9EC; border-${doc.lang === "ar" ? "right" : "left"}: 3px solid ${C.rose}; }
  .tip-label, .warn-label {
    font-weight: 700; font-size: 9pt;
    padding: 0.5mm 2mm; border-radius: 1.5mm;
    flex-shrink: 0;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .tip-label { background: ${C.mint}; color: ${C.deepNavy}; }
  .warn-label { background: ${C.rose}; color: #fff; }

  /* Screenshot */
  .screenshot { margin: 4mm 0; }
  .screenshot img {
    width: 100%; max-height: 110mm; object-fit: contain;
    border: 1px solid ${C.border}; border-radius: 2mm;
    background: #fff;
  }
  .screenshot figcaption {
    font-size: 9pt; color: ${C.textMuted};
    margin-top: 2mm; font-style: italic;
    text-align: center;
  }
  .screenshot-placeholder { width: 100%; }
  .placeholder-frame {
    width: 100%; height: 70mm;
    border: 2px dashed ${C.border};
    border-radius: 3mm;
    background: ${C.surface};
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: ${C.textMuted};
  }
  .placeholder-label {
    font-weight: 700; color: ${C.navy};
    font-size: 11pt; margin-bottom: 2mm;
  }
  .placeholder-sub { font-size: 9pt; opacity: 0.7; }

  /* Appendix */
  .appendix-item { margin-bottom: 8mm; }
  .appendix-item h3 { color: ${C.rose}; }

  /* Tables for keyboard / contacts */
  table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
  th, td {
    text-align: ${doc.lang === "ar" ? "right" : "left"};
    padding: 2mm 3mm;
    border-bottom: 1px solid ${C.border};
    font-size: 10pt;
  }
  th {
    background: ${C.surface};
    font-weight: 700;
    color: ${C.deepNavy};
  }
</style>
</head>
<body>
  ${renderCover(doc)}
  ${renderToc(doc, doc.lang)}
  ${chaptersHtml}
  ${appendixHtml}
</body>
</html>`;
}

/**
 * Helper for builders — turn a "screenshot slug" into the public path
 * served by Next.js. If a real PNG exists, the manual will display
 * it; otherwise the onerror handler shows the placeholder.
 */
export function shotPath(role: "admin" | "teacher" | "student", slug: string): string {
  return `/manuals/screenshots/${role}/${slug}.png`;
}
