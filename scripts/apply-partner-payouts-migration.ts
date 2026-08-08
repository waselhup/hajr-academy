/**
 * Additive migration — partner commission payouts + recurring discount.
 *
 *   PartnerSchool.discountRecurs   does the code keep discounting the SAME
 *                                  student on later purchases (charity case)
 *   PartnerPayout                  what was actually PAID to a partner, kept
 *                                  separate from what sales say is OWED
 *
 * Existing partner promo codes are re-opened to repeat use in the same pass,
 * since discountRecurs defaults to true and the code cap is what enforces it.
 *
 * Safe to re-run.  npx tsx scripts/apply-partner-payouts-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Mirrors RECURRING_USES_PER_USER in src/lib/finance/partner-referrals.ts. */
const RECURRING_USES_PER_USER = 999;

const STATEMENTS = [
  `ALTER TABLE "PartnerSchool"
     ADD COLUMN IF NOT EXISTS "discountRecurs" BOOLEAN NOT NULL DEFAULT true`,

  `DO $$ BEGIN
     CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER','CASH','OTHER');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "PartnerPayout" (
     "id"              TEXT PRIMARY KEY,
     "partnerSchoolId" TEXT NOT NULL,
     "amountSar"       DECIMAL(10,2) NOT NULL,
     "method"          "PayoutMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
     "reference"       TEXT,
     "note"            TEXT,
     "paidAt"          TIMESTAMP(3) NOT NULL,
     "createdBy"       TEXT,
     "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `DO $$ BEGIN
     ALTER TABLE "PartnerPayout"
       ADD CONSTRAINT "PartnerPayout_partnerSchoolId_fkey"
       FOREIGN KEY ("partnerSchoolId") REFERENCES "PartnerSchool"("id")
       ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE INDEX IF NOT EXISTS "PartnerPayout_partnerSchoolId_paidAt_idx"
     ON "PartnerPayout"("partnerSchoolId","paidAt")`,
  // Every table on this database has RLS on — a new one must not be the hole.
  `ALTER TABLE "PartnerPayout" ENABLE ROW LEVEL SECURITY`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 76));
  }

  // Partner codes were minted with a one-per-student cap, which is exactly
  // what stopped a sponsored student getting the discount a second month.
  const reopened = await prisma.$executeRawUnsafe(
    `UPDATE "PromoCode" p
        SET "maxUsesPerUser" = ${RECURRING_USES_PER_USER}
       FROM "PartnerSchool" s
      WHERE p."partnerSchoolId" = s."id"
        AND s."discountRecurs" = true
        AND p."maxUsesPerUser" < ${RECURRING_USES_PER_USER}`
  );
  console.log("partner codes re-opened to repeat use:", reopened);

  const rls = await prisma.$queryRawUnsafe<{ relrowsecurity: boolean }[]>(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'PartnerPayout'`
  );
  const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'PartnerSchool' AND column_name = 'discountRecurs'`
  );
  console.log("PartnerPayout RLS on:", rls[0]?.relrowsecurity);
  console.log("PartnerSchool.discountRecurs:", cols);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
