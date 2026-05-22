import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/promo-codes/[id] — update a promo code (admin).
 *
 * Editable: isActive, maxUses, maxUsesPerUser, expiresAt, description(Ar).
 * The code string and discount value/type are immutable once issued.
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
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { id: params.id },
    });
    if (!promo) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.maxUses === null) data.maxUses = null;
    else if (Number.isFinite(Number(body.maxUses)))
      data.maxUses = Number(body.maxUses);
    if (Number.isFinite(Number(body.maxUsesPerUser)))
      data.maxUsesPerUser = Math.max(1, Number(body.maxUsesPerUser));
    if (body.expiresAt === null) data.expiresAt = null;
    else if (typeof body.expiresAt === "string")
      data.expiresAt = new Date(body.expiresAt);
    if (typeof body.description === "string")
      data.description = body.description;
    if (typeof body.descriptionAr === "string")
      data.descriptionAr = body.descriptionAr;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No editable fields supplied" },
        { status: 400 }
      );
    }

    await prisma.promoCode.update({ where: { id: params.id }, data });
    await logAudit({
      userId: session.user.id,
      action: "PROMO_CODE_UPDATED",
      entity: "PromoCode",
      entityId: params.id,
      metadata: { fields: Object.keys(data) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/promo-codes/[id]] PATCH failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not update promo code" },
      { status: 500 }
    );
  }
}
