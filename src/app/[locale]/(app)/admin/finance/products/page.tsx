import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

/**
 * /admin/finance/products — the owner's price list.
 *
 * These rows are what the landing page shows and what the checkout charges,
 * so editing a price here changes both at once; there is no second place to
 * keep in sync.
 */
export default async function AdminProductsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const rows = await prisma.catalogProduct.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <ProductsClient
      products={rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        descAr: p.descAr,
        descEn: p.descEn,
        priceSar: Number(p.priceSar),
        compareAtSar: p.compareAtSar == null ? null : Number(p.compareAtSar),
        unitAr: p.unitAr,
        unitEn: p.unitEn,
        group: p.group,
        packageType: p.packageType,
        requiresGradeLevel: p.requiresGradeLevel,
        isActive: p.isActive,
        sortOrder: p.sortOrder,
      }))}
    />
  );
}
