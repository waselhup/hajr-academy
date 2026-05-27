import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateBrandBookHtml } from "@/lib/brand-kit/book-pdf";
import { sendEmail } from "@/lib/comms/email";
import { logAudit } from "@/lib/audit";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = (await req.json()) as { email?: string; note?: string };
  const email = body.email?.trim();
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }
  const buf = generateBrandBookHtml();
  const note = (body.note ?? "").trim();

  const html = `<!doctype html><html><body style="font-family:Inter,sans-serif;color:#1E2A36;line-height:1.6;">
    <h2 style="color:#1E2A36;">Hajr A° Brand Book v3.0</h2>
    <p>Hello,</p>
    <p>Please find the Hajr A° Brand Book v3.0 attached. It covers logos, color palette, typography, voice, and social templates.</p>
    ${note ? `<p style="background:#FAF6EE;padding:12px;border-inline-start:3px solid #B86E7B;">${note.replace(/</g, "&lt;")}</p>` : ""}
    <p style="margin-top:24px;">— ${BRAND.name.en}<br/>${BRAND.contact.email}</p>
  </body></html>`;

  const result = await sendEmail({
    to: email,
    subject: `${BRAND.name.en} — Brand Book v3.0`,
    html,
    attachments: [
      {
        filename: "hajr-academy-brand-book-v3.html",
        content: buf.toString("base64"),
      },
    ],
  });

  await logAudit({
    action: "BRAND_BOOK_SENT",
    entity: "BrandKitAsset",
    metadata: { to: email, success: result.success, mocked: result.mocked },
  });

  return NextResponse.json({ ok: result.success, mocked: result.mocked });
}
