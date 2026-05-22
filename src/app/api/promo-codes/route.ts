import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { PackageType, PromoType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PROMO_TYPES: PromoType[] = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_MONTHS"];
const PACKAGE_TYPES: PackageType[] = [
  "ESSENTIAL",
  "INTEGRATED",
  "PRIVATE",
  "SCHOOL",
];

/** GET /api/promo-codes — list all promo codes (admin). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const rows = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { subscriptions: true } } },
    });
    const codes = rows.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      maxUses: c.maxUses,
      currentUses: c.currentUses,
      maxUsesPerUser: c.maxUsesPerUser,
      applicablePackages: c.applicablePackages,
      startsAt: c.startsAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      isActive: c.isActive,
      description: c.description,
      descriptionAr: c.descriptionAr,
      timesUsed: c._count.subscriptions,
    }));
    return NextResponse.json({ codes });
  } catch (e) {
    console.error("[api/promo-codes] GET failed:", e);
    return NextResponse.json(
      { error: "Failed to load promo codes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promo-codes — create a promo code (admin).
 * Body: { code, type, value, maxUses?, maxUsesPerUser?, applicablePackages?,
 *         startsAt?, expiresAt?, description?, descriptionAr? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const code = (typeof body.code === "string" ? body.code : "")
      .trim()
      .toUpperCase();
    const type = body.type as PromoType;
    const value = Number(body.value);

    if (!code || !/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 3–32 letters, digits, - or _." },
        { status: 400 }
      );
    }
    if (!PROMO_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid promo type" }, { status: 400 });
    }
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json(
        { error: "Value must be a positive number" },
        { status: 400 }
      );
    }
    if (type === "PERCENTAGE" && value > 100) {
      return NextResponse.json(
        { error: "Percentage cannot exceed 100" },
        { status: 400 }
      );
    }

    const existing = await prisma.promoCode.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "A promo code with this code already exists" },
        { status: 409 }
      );
    }

    const applicablePackages: PackageType[] = Array.isArray(
      body.applicablePackages
    )
      ? body.applicablePackages.filter((p: unknown) =>
          PACKAGE_TYPES.includes(p as PackageType)
        )
      : [];

    const created = await prisma.promoCode.create({
      data: {
        code,
        type,
        value,
        maxUses:
          body.maxUses != null && Number.isFinite(Number(body.maxUses))
            ? Number(body.maxUses)
            : null,
        maxUsesPerUser:
          body.maxUsesPerUser != null
            ? Math.max(1, Number(body.maxUsesPerUser))
            : 1,
        applicablePackages,
        applicablePrograms: [],
        startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive !== false,
        description:
          typeof body.description === "string" ? body.description : null,
        descriptionAr:
          typeof body.descriptionAr === "string" ? body.descriptionAr : null,
        createdBy: session.user.id,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "PROMO_CODE_CREATED",
      entity: "PromoCode",
      entityId: created.id,
      metadata: { code, type, value },
    });

    return NextResponse.json({ ok: true, id: created.id, code: created.code });
  } catch (e) {
    console.error("[api/promo-codes] POST failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not create promo code" },
      { status: 500 }
    );
  }
}
