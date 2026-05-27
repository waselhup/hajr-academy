/**
 * Serves the latest /delivery/_RUNBOOK.md as a print-styled HTML so the
 * owner can save it as PDF or print directly.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mdToHtml(md: string): string {
  // Tiny markdown rendering — headings, paragraphs, lists, code.
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  for (const raw of lines) {
    if (raw.trim().startsWith("```")) {
      if (inCode) { out.push("</pre>"); inCode = false; }
      else { out.push("<pre>"); inCode = true; }
      continue;
    }
    if (inCode) { out.push(esc(raw)); continue; }
    const headingMatch = raw.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (inList) { out.push("</ul>"); inList = false; }
      const level = headingMatch[1].length;
      out.push(`<h${level}>${esc(headingMatch[2])}</h${level}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(raw)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${esc(raw.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (raw.trim() === "") { out.push(""); continue; }
    out.push(`<p>${esc(raw)}</p>`);
  }
  if (inList) out.push("</ul>");
  if (inCode) out.push("</pre>");
  return out.join("\n");
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  let md = "";
  try {
    md = readFileSync(join(process.cwd(), "delivery", "_RUNBOOK.md"), "utf8");
  } catch {
    md = "# Runbook\n\nRunbook file not found at deploy time.";
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>${esc(BRAND.name.en)} — Runbook</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Inter, sans-serif; color: ${BRAND.palette.deepNavy}; line-height: 1.6; max-width: 720px; }
    h1 { color: ${BRAND.palette.deepNavy}; border-bottom: 3px solid ${BRAND.palette.rose}; padding-bottom: 4mm; }
    h2 { color: ${BRAND.palette.deepNavy}; border-bottom: 1px solid ${BRAND.palette.border}; padding-bottom: 2mm; margin-top: 10mm; }
    h3 { color: ${BRAND.palette.navy}; }
    pre { background: ${BRAND.palette.ivory}; padding: 4mm; border-radius: 4mm; font-size: 10pt; overflow-x: auto; }
    code { background: ${BRAND.palette.ivory}; padding: 1px 4px; border-radius: 3px; }
    ul { padding-inline-start: 24px; }
    li { margin: 1mm 0; }
  </style></head><body>
  ${mdToHtml(md)}
  </body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-runbook.html"`,
    },
  });
}
