import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const VALID = ["NEW", "REPLIED", "CLOSED"] as const;

/**
 * PATCH /api/admin/communications/contacts/[id] — update a contact
 * submission's status. Body: { status: "NEW" | "REPLIED" | "CLOSED" }
 * Every status change is written to the AuditLog.
 */
export async function PATCH(
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
    const status = String(body.status ?? "").toUpperCase();
    if (!VALID.includes(status as (typeof VALID)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.contactSubmission.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.contactSubmission.update({
      where: { id: params.id },
      data: {
        status: status as (typeof VALID)[number],
        repliedBy: status === "REPLIED" ? session.user.id : undefined,
        repliedAt: status === "REPLIED" ? new Date() : undefined,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "CONTACT_STATUS_CHANGED",
      entity: "ContactSubmission",
      entityId: params.id,
      metadata: { from: existing.status, to: status },
    });

    return NextResponse.json({
      ok: true,
      submission: {
        id: updated.id,
        status: updated.status,
        repliedAt: updated.repliedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error("[api/admin/communications/contacts/[id]] failed:", e);
    return NextResponse.json(
      { error: "Failed to update contact request" },
      { status: 500 }
    );
  }
}
