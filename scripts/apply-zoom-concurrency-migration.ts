/**
 * Additive migration: ZoomAccount.maxConcurrent
 *
 * How many meetings one Zoom host user may run simultaneously. A standard
 * licensed Zoom user is 1; Zoom's "concurrent meetings" add-on raises it.
 *
 * Safe to re-run.  npx tsx scripts/apply-zoom-concurrency-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `ALTER TABLE "ZoomAccount"
     ADD COLUMN IF NOT EXISTS "maxConcurrent" INTEGER NOT NULL DEFAULT 1`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 76));
  }

  const cols = await prisma.$queryRawUnsafe<
    { column_name: string; column_default: string | null }[]
  >(
    `SELECT column_name, column_default FROM information_schema.columns
      WHERE table_name = 'ZoomAccount' AND column_name = 'maxConcurrent'`
  );
  console.log("column:", cols);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
