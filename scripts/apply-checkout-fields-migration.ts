/**
 * Additive migration — grade level + preferred teaching window at checkout.
 *
 *   CatalogProduct.requiresGradeLevel  ask for the school year on this product
 *   PurchaseOrder.gradeLevel           what the buyer answered
 *   PurchaseOrder.preferredTime        which teaching window they picked
 *
 * Curriculum products (the CORE group — التقوية الفصلية) are switched on in
 * the same pass, since that is the family the owner asked for. Exam courses
 * (STEP, IELTS) stay off: the school year does not affect their placement.
 *
 * Safe to re-run.  npx tsx scripts/apply-checkout-fields-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `ALTER TABLE "CatalogProduct"
     ADD COLUMN IF NOT EXISTS "requiresGradeLevel" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "gradeLevel"    TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "preferredTime" TEXT`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 76));
  }

  const turnedOn = await prisma.$executeRawUnsafe(
    `UPDATE "CatalogProduct"
        SET "requiresGradeLevel" = true
      WHERE "group" = 'CORE' AND "requiresGradeLevel" = false`
  );
  console.log("curriculum products now asking for the school year:", turnedOn);

  const rows = await prisma.$queryRawUnsafe<
    { slug: string; requiresGradeLevel: boolean }[]
  >(
    `SELECT slug, "requiresGradeLevel" FROM "CatalogProduct" ORDER BY "group", "sortOrder"`
  );
  console.table(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
