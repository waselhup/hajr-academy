/**
 * Apply the Payment.moyasarPaymentId unique index to the live DB.
 * Additive + safe: aborts if duplicate non-null values exist.
 * Run: npx tsx scripts/apply-moyasar-unique-index.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dupes = await prisma.$queryRawUnsafe<
    { moyasarPaymentId: string; n: bigint }[]
  >(
    `SELECT "moyasarPaymentId", COUNT(*) AS n
     FROM "Payment"
     WHERE "moyasarPaymentId" IS NOT NULL
     GROUP BY "moyasarPaymentId"
     HAVING COUNT(*) > 1`
  );
  if (dupes.length > 0) {
    console.error("ABORT — duplicate moyasarPaymentId values:", dupes);
    process.exit(1);
  }
  console.log("No duplicates. Applying index…");

  await prisma.$executeRawUnsafe(
    `DROP INDEX IF EXISTS "Payment_moyasarPaymentId_idx"`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_moyasarPaymentId_key"
     ON "Payment"("moyasarPaymentId")`
  );

  const check = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
    `SELECT indexname FROM pg_indexes
     WHERE tablename = 'Payment' AND indexname LIKE '%moyasar%'`
  );
  console.log("Indexes now:", check);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
