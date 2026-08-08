import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Admin catalogue management — the owner adds and edits purchasable
 * products here, which is what the public site prices and charges from.
 *
 * Price changes are audit-logged: money is involved, so every edit must be
 * attributable.
 */

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const productSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  nameAr: z.string().min(2).max(160),
  nameEn: z.string().min(2).max(160),
  descAr: z.string().max(400).optional().or(z.literal("")),
  descEn: z.string().max(400).optional().or(z.literal("")),
  priceSar: z.number().min(1).max(100000),
  compareAtSar: z.number().min(0).max(100000).nullable().optional(),
  unitAr: z.string().min(1).max(40),
  unitEn: z.string().min(1).max(40),
  group: z.enum(["CORE", "COURSE", "SUMMER"]),
  packageType: z
    .enum(["ESSENTIAL", "INTEGRATED", "PRIVATE", "SCHOOL", "STEP_PREP_PKG", "IELTS_PREP_PKG"])
    .nullable()
    .optional(),
  /** Ask the buyer for the student's school year on this product. */
  requiresGradeLevel: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!ADMIN_ROLES.includes(session.user.role)) {
    return { error: "Admins only", status: 403 as const };
  }
  return { session };
}

/** GET — every product, active or not. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const products = await prisma.catalogProduct.findMany({
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        priceSar: Number(p.priceSar),
        compareAtSar: p.compareAtSar == null ? null : Number(p.compareAtSar),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[admin/catalog] GET failed:", e);
    return NextResponse.json({ error: "Could not load products" }, { status: 500 });
  }
}

/** POST — create a product. */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const parsed = productSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const clash = await prisma.catalogProduct.findUnique({
      where: { slug: d.slug },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: "A product with this slug already exists." },
        { status: 409 }
      );
    }

    const created = await prisma.catalogProduct.create({
      data: {
        slug: d.slug,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        descAr: d.descAr || null,
        descEn: d.descEn || null,
        priceSar: d.priceSar,
        compareAtSar: d.compareAtSar ?? null,
        unitAr: d.unitAr,
        unitEn: d.unitEn,
        group: d.group,
        packageType: d.packageType ?? null,
        requiresGradeLevel: d.requiresGradeLevel ?? false,
        isActive: d.isActive ?? true,
        sortOrder: d.sortOrder ?? 999,
      },
    });

    await logAudit({
      userId: gate.session.user.id,
      action: "CATALOG_PRODUCT_CREATED",
      entity: "CatalogProduct",
      entityId: created.id,
      metadata: { slug: d.slug, priceSar: d.priceSar },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[admin/catalog] POST failed:", e);
    return NextResponse.json({ error: "Could not create product" }, { status: 500 });
  }
}

/** PATCH — edit a product (by id). */
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const before = await prisma.catalogProduct.findUnique({
      where: { id },
      select: { priceSar: true, slug: true },
    });
    if (!before) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const d = parsed.data;

    // The slug is the identity past orders were written against, and it is
    // what public pay links point at. Renaming it would orphan order
    // history and break every live link, so it is immutable — retire the
    // product and create a new one instead.
    if (d.slug !== undefined && d.slug !== before.slug) {
      return NextResponse.json(
        {
          error:
            "A product's slug cannot be changed — retire it and create a new product instead.",
        },
        { status: 400 }
      );
    }
    const updated = await prisma.catalogProduct.update({
      where: { id },
      data: {
        ...(d.nameAr !== undefined ? { nameAr: d.nameAr } : {}),
        ...(d.nameEn !== undefined ? { nameEn: d.nameEn } : {}),
        ...(d.descAr !== undefined ? { descAr: d.descAr || null } : {}),
        ...(d.descEn !== undefined ? { descEn: d.descEn || null } : {}),
        ...(d.priceSar !== undefined ? { priceSar: d.priceSar } : {}),
        ...(d.compareAtSar !== undefined
          ? { compareAtSar: d.compareAtSar ?? null }
          : {}),
        ...(d.unitAr !== undefined ? { unitAr: d.unitAr } : {}),
        ...(d.unitEn !== undefined ? { unitEn: d.unitEn } : {}),
        ...(d.group !== undefined ? { group: d.group } : {}),
        ...(d.packageType !== undefined
          ? { packageType: d.packageType ?? null }
          : {}),
        ...(d.requiresGradeLevel !== undefined
          ? { requiresGradeLevel: d.requiresGradeLevel }
          : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      },
    });

    if (d.priceSar !== undefined && Number(before.priceSar) !== d.priceSar) {
      await logAudit({
        userId: gate.session.user.id,
        action: "CATALOG_PRICE_CHANGED",
        entity: "CatalogProduct",
        entityId: id,
        metadata: {
          slug: before.slug,
          from: Number(before.priceSar),
          to: d.priceSar,
        },
      });
    } else {
      await logAudit({
        userId: gate.session.user.id,
        action: "CATALOG_PRODUCT_UPDATED",
        entity: "CatalogProduct",
        entityId: id,
        metadata: { slug: updated.slug },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/catalog] PATCH failed:", e);
    return NextResponse.json({ error: "Could not update product" }, { status: 500 });
  }
}

/**
 * DELETE — retire a product.
 *
 * Deactivates rather than deletes: past orders reference the slug, and a
 * hard delete would orphan them.
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const exists = await prisma.catalogProduct.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    await prisma.catalogProduct.update({
      where: { id },
      data: { isActive: false },
    });
    await logAudit({
      userId: gate.session.user.id,
      action: "CATALOG_PRODUCT_RETIRED",
      entity: "CatalogProduct",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/catalog] DELETE failed:", e);
    return NextResponse.json({ error: "Could not retire product" }, { status: 500 });
  }
}
