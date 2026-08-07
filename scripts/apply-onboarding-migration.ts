/**
 * Additive migration for the onboarding automation:
 *   - PasswordResetToken.purpose (RESET | SETUP)
 *   - PurchaseOrder.setupUrl
 *   - PartnerApplication table (+ its status enum), RLS on
 *
 * Safe to re-run.  npx tsx scripts/apply-onboarding-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `DO $$ BEGIN
     CREATE TYPE "TokenPurpose" AS ENUM ('RESET','SETUP');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "PasswordResetToken"
     ADD COLUMN IF NOT EXISTS "purpose" "TokenPurpose" NOT NULL DEFAULT 'RESET'`,

  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "setupUrl" TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "fulfilmentClaimedAt" TIMESTAMP(3)`,

  `DO $$ BEGIN
     CREATE TYPE "PartnerApplicationStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "PartnerApplication" (
     "id"               TEXT PRIMARY KEY,
     "orgNameAr"        TEXT NOT NULL,
     "orgNameEn"        TEXT,
     "partnerType"      "PartnerType" NOT NULL DEFAULT 'SCHOOL',
     "contactName"      TEXT NOT NULL,
     "contactEmail"     TEXT NOT NULL,
     "contactPhone"     TEXT NOT NULL,
     "city"             TEXT NOT NULL,
     "crNumber"         TEXT,
     "expectedStudents" INTEGER,
     "about"            TEXT NOT NULL,
     "status"           "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
     "reviewedBy"       TEXT,
     "reviewedAt"       TIMESTAMP(3),
     "reviewNote"       TEXT,
     "partnerSchoolId"  TEXT,
     "promoCode"        TEXT,
     "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS "PartnerApplication_status_createdAt_idx"
     ON "PartnerApplication"("status","createdAt")`,
  `ALTER TABLE "PartnerApplication" ADD COLUMN IF NOT EXISTS "setupUrl" TEXT`,
  `ALTER TABLE "PartnerApplication" ENABLE ROW LEVEL SECURITY`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 76));
  }

  const checks = await prisma.$queryRawUnsafe<
    { table_name: string; column_name: string }[]
  >(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE (table_name = 'PasswordResetToken' AND column_name = 'purpose')
         OR (table_name = 'PurchaseOrder'      AND column_name IN ('setupUrl','fulfilmentClaimedAt'))
         OR (table_name = 'PartnerApplication' AND column_name = 'setupUrl')`
  );
  const rls = await prisma.$queryRawUnsafe<{ relrowsecurity: boolean }[]>(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'PartnerApplication'`
  );
  console.log("new columns:", checks);
  console.log("PartnerApplication RLS on:", rls[0]?.relrowsecurity);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
