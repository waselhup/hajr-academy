/**
 * Additive migration: CatalogProduct + PurchaseOrder promo columns.
 * Safe to re-run. Enables RLS on the new table (platform rule: every table
 * has RLS on; server code reaches the DB through the service role).
 *
 *   npx tsx scripts/apply-catalog-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `DO $$ BEGIN
     CREATE TYPE "CatalogGroup" AS ENUM ('CORE','COURSE','SUMMER');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "CatalogProduct" (
     "id"           TEXT PRIMARY KEY,
     "slug"         TEXT NOT NULL,
     "nameAr"       TEXT NOT NULL,
     "nameEn"       TEXT NOT NULL,
     "descAr"       TEXT,
     "descEn"       TEXT,
     "priceSar"     DECIMAL(10,2) NOT NULL,
     "compareAtSar" DECIMAL(10,2),
     "unitAr"       TEXT NOT NULL,
     "unitEn"       TEXT NOT NULL,
     "group"        "CatalogGroup" NOT NULL DEFAULT 'COURSE',
     "packageType"  "PackageType",
     "isActive"     BOOLEAN NOT NULL DEFAULT true,
     "sortOrder"    INTEGER NOT NULL DEFAULT 0,
     "bulletsAr"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
     "bulletsEn"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
     "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CatalogProduct_slug_key" ON "CatalogProduct"("slug")`,
  `CREATE INDEX IF NOT EXISTS "CatalogProduct_isActive_group_sortOrder_idx"
     ON "CatalogProduct"("isActive","group","sortOrder")`,
  `ALTER TABLE "CatalogProduct" ENABLE ROW LEVEL SECURITY`,

  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "productSlug"  TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "listPriceSar" DECIMAL(10,2)`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "discountSar"  DECIMAL(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "promoCode"    TEXT`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 78));
  }

  const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'PurchaseOrder'
       AND column_name IN ('productSlug','listPriceSar','discountSar','promoCode')`
  );
  const rls = await prisma.$queryRawUnsafe<{ relrowsecurity: boolean }[]>(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'CatalogProduct'`
  );
  console.log("PurchaseOrder new columns:", cols.map((c) => c.column_name).sort());
  console.log("CatalogProduct RLS on:", rls[0]?.relrowsecurity);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
