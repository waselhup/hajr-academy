/**
 * POST /api/admin/certificates/[id]/revoke
 * Body: { reason: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { student: { include: { user: true } } },
  });
  if (!cert) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  await prisma.certificate.update({
    where: { id },
    data: { revoked: true, revokedReason: body.reason ?? null },
  });

  try {
    await notify({
      userId: cert.student.user.id,
      type: "CERTIFICATE_REVOKED",
      title: `Certificate revoked: ${cert.titleEn}`,
      titleAr: `سُحبت الشهادة: ${cert.titleAr}`,
      body: body.reason || "Your certificate has been revoked.",
      bodyAr: body.reason || "تم سحب شهادتك",
      channels: ["inApp", "email"],
      priority: "HIGH",
      refType: "Certificate",
      refId: id,
    });
  } catch (e) {
    console.error("[cert:revoke] notify failed:", e);
  }

  await audit.mutation(session.user.id, "CERTIFICATE_REVOKED", "Certificate", id, {
    reason: body.reason,
  });
  return NextResponse.json({ ok: true });
}
