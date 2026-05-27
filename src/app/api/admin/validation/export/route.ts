import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { VALIDATION_CATEGORIES } from "@/lib/validation/teacher-requests";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

interface SignOff {
  verified: boolean;
  signedByName: string;
  notes: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const dataParam = req.nextUrl.searchParams.get("data") ?? "";
  let signoffs: Record<string, SignOff> = {};
  try {
    if (dataParam) {
      signoffs = JSON.parse(
        decodeURIComponent(escape(Buffer.from(dataParam, "base64").toString("binary")))
      );
    }
  } catch {
    signoffs = {};
  }
  const total = VALIDATION_CATEGORIES.length;
  const verified = VALIDATION_CATEGORIES.filter(
    (c) => signoffs[c.key]?.verified
  ).length;

  const today = new Date().toISOString().slice(0, 10);

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Hajr Academy — Validation Report</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Inter, -apple-system, sans-serif; color: ${BRAND.palette.deepNavy}; }
    h1 { font-size: 22pt; color: ${BRAND.palette.deepNavy}; }
    h2 { font-size: 14pt; margin-top: 14mm; color: ${BRAND.palette.deepNavy}; border-bottom: 2px solid ${BRAND.palette.rose}; padding-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8mm; }
    .badge { background: ${BRAND.palette.mint}; color: ${BRAND.palette.deepNavy}; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 10pt; }
    .stat { background: ${BRAND.palette.ivory}; border: 1px solid ${BRAND.palette.border}; border-radius: 8px; padding: 8mm; margin: 6mm 0; }
    .stat .num { font-size: 32pt; font-weight: 800; color: ${BRAND.palette.rose}; }
    .item { border: 1px solid ${BRAND.palette.border}; border-radius: 6px; padding: 6mm; margin: 4mm 0; page-break-inside: avoid; }
    .item .head { display: flex; justify-content: space-between; align-items: center; }
    .ok { color: #27AE60; font-weight: 700; }
    .pending { color: ${BRAND.palette.textMuted}; font-style: italic; }
    .quote { background: ${BRAND.palette.ivory}; border-inline-start: 4px solid ${BRAND.palette.mint}; padding: 4mm; font-size: 10pt; }
    ul { margin: 3mm 0; padding-inline-start: 18px; font-size: 10pt; }
    .signoff { background: ${BRAND.palette.ivory}; padding: 4mm; border-radius: 4px; margin-top: 4mm; font-size: 10pt; }
    .footer { font-size: 8pt; color: ${BRAND.palette.textMuted}; text-align: center; margin-top: 12mm; }
  </style></head>
  <body>
    <div class="header">
      <div>
        <h1>${esc(BRAND.name.en)}</h1>
        <div style="color:${BRAND.palette.textMuted};font-size:11pt;">Teacher Validation Report · ${today}</div>
      </div>
      <span class="badge">v2.0 Delivery</span>
    </div>
    <div class="stat">
      <div class="num">${verified} / ${total}</div>
      <div style="color:${BRAND.palette.textMuted};">Features verified by teachers</div>
    </div>
    <h2>Feedback categories</h2>
    ${VALIDATION_CATEGORIES.map((c) => {
      const so = signoffs[c.key];
      const verifiedStr = so?.verified
        ? `<span class="ok">✓ Verified${so.signedByName ? " — " + esc(so.signedByName) : ""}</span>`
        : `<span class="pending">— Pending</span>`;
      return `<div class="item">
        <div class="head">
          <h3 style="margin:0;">${esc(c.title)} <span style="color:${BRAND.palette.rose};font-size:10pt;">Sprint ${c.sprint}</span></h3>
          ${verifiedStr}
        </div>
        <p class="quote">"${esc(c.originalRequest)}"</p>
        <strong>Delivered as:</strong>
        <ul>${c.deliveredAs.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        ${so?.notes ? `<div class="signoff"><strong>Teacher notes:</strong><br/>${esc(so.notes)}</div>` : ""}
      </div>`;
    }).join("")}
    <div class="footer">Generated ${new Date().toISOString()} · ${esc(BRAND.contact.email)}</div>
  </body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajr-validation-report-${today}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
