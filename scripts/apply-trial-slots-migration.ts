/**
 * Additive migration — admin-published trial-lesson times.
 *
 *   TrialSlot              a concrete date/time visitors can book
 *   TrialRequest.slotId    which one they picked
 *
 * `preferredTime` stays: requests that came through the assistant or the old
 * landing form carry free text there, and dropping it would erase them.
 *
 * Safe to re-run.  npx tsx scripts/apply-trial-slots-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "TrialSlot" (
     "id"              TEXT PRIMARY KEY,
     "startsAt"        TIMESTAMP(3) NOT NULL,
     "durationMinutes" INTEGER NOT NULL DEFAULT 30,
     "capacity"        INTEGER NOT NULL DEFAULT 1,
     "isActive"        BOOLEAN NOT NULL DEFAULT true,
     "note"            TEXT,
     "createdBy"       TEXT,
     "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS "TrialSlot_startsAt_isActive_idx"
     ON "TrialSlot"("startsAt","isActive")`,
  // Every table on this database has RLS on — a new one must not be the hole.
  `ALTER TABLE "TrialSlot" ENABLE ROW LEVEL SECURITY`,

  `ALTER TABLE "TrialRequest" ADD COLUMN IF NOT EXISTS "slotId" TEXT`,
  `DO $$ BEGIN
     ALTER TABLE "TrialRequest"
       ADD CONSTRAINT "TrialRequest_slotId_fkey"
       FOREIGN KEY ("slotId") REFERENCES "TrialSlot"("id")
       ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE INDEX IF NOT EXISTS "TrialRequest_slotId_idx"
     ON "TrialRequest"("slotId")`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 76));
  }

  const rls = await prisma.$queryRawUnsafe<{ relrowsecurity: boolean }[]>(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'TrialSlot'`
  );
  const col = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'TrialRequest' AND column_name = 'slotId'`
  );
  console.log("TrialSlot RLS on:", rls[0]?.relrowsecurity);
  console.log("TrialRequest.slotId:", col);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
