/**
 * Additive migration — Success Partners are paid a COMMISSION, not a retainer.
 *
 *   PartnerSchool.commissionPercent   the partner's cut of a referred
 *                                     student's first purchase
 *   PurchaseOrder.partnerSchoolId     which partner's code brought the sale
 *   PurchaseOrder.partnerCommissionSar commission frozen at settlement
 *
 * `monthlyFeeSar` is left in place: old rows carry real numbers and dropping
 * a NOT NULL column would break any deploy still running the old build.
 *
 * Safe to re-run.  npx tsx scripts/apply-partner-commission-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `ALTER TABLE "PartnerSchool"
     ADD COLUMN IF NOT EXISTS "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0`,

  `ALTER TABLE "PurchaseOrder"
     ADD COLUMN IF NOT EXISTS "partnerSchoolId" TEXT`,
  `ALTER TABLE "PurchaseOrder"
     ADD COLUMN IF NOT EXISTS "partnerCommissionSar" DECIMAL(10,2)`,

  // Named exactly as Prisma would, so a future `prisma migrate` sees it as
  // already applied instead of trying to create it again.
  `DO $$ BEGIN
     ALTER TABLE "PurchaseOrder"
       ADD CONSTRAINT "PurchaseOrder_partnerSchoolId_fkey"
       FOREIGN KEY ("partnerSchoolId") REFERENCES "PartnerSchool"("id")
       ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE INDEX IF NOT EXISTS "PurchaseOrder_partnerSchoolId_paymentStatus_idx"
     ON "PurchaseOrder"("partnerSchoolId","paymentStatus")`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 76));
  }

  const cols = await prisma.$queryRawUnsafe<
    { table_name: string; column_name: string; data_type: string }[]
  >(
    `SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE (table_name = 'PartnerSchool' AND column_name = 'commissionPercent')
         OR (table_name = 'PurchaseOrder' AND column_name IN ('partnerSchoolId','partnerCommissionSar'))
      ORDER BY table_name, column_name`
  );
  console.log("new columns:", cols);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
