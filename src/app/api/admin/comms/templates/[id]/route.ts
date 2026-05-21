import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** PUT /api/admin/comms/templates/[id] — edit a template. */
export async function PUT(
  req: NextRequest,
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
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const field of ["subjectAr", "subjectEn", "bodyAr", "bodyEn"]) {
      if (typeof body[field] === "string") data[field] = body[field];
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data,
    });

    await logAudit({
      userId: session.user.id,
      action: "EMAIL_TEMPLATE_UPDATED",
      entity: "EmailTemplate",
      entityId: params.id,
      metadata: { key: template.key },
    });

    return NextResponse.json({ template });
  } catch (e) {
    console.error("[api/admin/comms/templates/[id]] PUT failed:", e);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}
