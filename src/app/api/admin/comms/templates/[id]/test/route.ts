import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/comms/email";
import { renderTemplate, wrapEmailShell } from "@/lib/comms/templates";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/comms/templates/[id]/test — send a test render of a
 * template to the admin's own email. Template variables are filled with
 * placeholder values so the layout can be eyeballed.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fill every declared variable with a readable placeholder.
    const vars: Record<string, string> = {
      name: session.user.name ?? "Admin",
    };
    for (const v of template.variables) {
      if (!vars[v]) vars[v] = `[${v}]`;
    }

    const adminEmail = session.user.email;
    if (!adminEmail) {
      return NextResponse.json(
        { error: "Your account has no email address" },
        { status: 400 }
      );
    }

    const subject = renderTemplate(template.subjectEn, vars);
    const inner = renderTemplate(template.bodyEn, vars);
    const html = wrapEmailShell({ bodyHtml: inner, locale: "en" });

    const result = await sendEmail({
      to: adminEmail,
      subject: `[TEST] ${subject}`,
      html,
    });

    return NextResponse.json({
      ok: result.success,
      mocked: result.mocked ?? false,
      sentTo: adminEmail,
      error: result.error,
    });
  } catch (e) {
    console.error("[api/admin/comms/templates/[id]/test] failed:", e);
    return NextResponse.json({ error: "Test send failed" }, { status: 500 });
  }
}
