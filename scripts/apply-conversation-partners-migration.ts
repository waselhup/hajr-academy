/**
 * Additive migration — conversation partners.
 *
 *   Role += CONVERSATION_PARTNER
 *   ConversationPartnerApplication   the public application
 *   ConversationPartnerProfile       an approved partner
 *   SpeakingClubEvent.conversationPartnerId
 *
 * Reuses the existing PartnerApplicationStatus enum (PENDING/APPROVED/
 * REJECTED) rather than minting a second identical one.
 *
 * Safe to re-run.  npx tsx scripts/apply-conversation-partners-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction block in older
  // Postgres; IF NOT EXISTS makes the re-run safe either way.
  `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONVERSATION_PARTNER'`,

  `CREATE TABLE IF NOT EXISTS "ConversationPartnerApplication" (
     "id"             TEXT PRIMARY KEY,
     "fullName"       TEXT NOT NULL,
     "email"          TEXT NOT NULL,
     "phone"          TEXT NOT NULL,
     "country"        TEXT NOT NULL,
     "nativeLanguage" TEXT NOT NULL,
     "otherLanguages" TEXT,
     "timezone"       TEXT NOT NULL,
     "availability"   TEXT NOT NULL,
     "about"          TEXT NOT NULL,
     "linkedin"       TEXT,
     "status"         "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
     "reviewedBy"     TEXT,
     "reviewedAt"     TIMESTAMP(3),
     "reviewNote"     TEXT,
     "userId"         TEXT,
     "setupUrl"       TEXT,
     "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS "ConversationPartnerApplication_status_createdAt_idx"
     ON "ConversationPartnerApplication"("status","createdAt")`,
  `ALTER TABLE "ConversationPartnerApplication" ENABLE ROW LEVEL SECURITY`,

  `CREATE TABLE IF NOT EXISTS "ConversationPartnerProfile" (
     "id"             TEXT PRIMARY KEY,
     "userId"         TEXT NOT NULL UNIQUE,
     "country"        TEXT NOT NULL,
     "nativeLanguage" TEXT NOT NULL,
     "otherLanguages" TEXT,
     "timezone"       TEXT NOT NULL,
     "availability"   TEXT,
     "bio"            TEXT,
     "isActive"       BOOLEAN NOT NULL DEFAULT true,
     "applicationId"  TEXT,
     "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `DO $$ BEGIN
     ALTER TABLE "ConversationPartnerProfile"
       ADD CONSTRAINT "ConversationPartnerProfile_userId_fkey"
       FOREIGN KEY ("userId") REFERENCES "User"("id")
       ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "ConversationPartnerProfile" ENABLE ROW LEVEL SECURITY`,

  `ALTER TABLE "SpeakingClubEvent"
     ADD COLUMN IF NOT EXISTS "conversationPartnerId" TEXT`,
  `DO $$ BEGIN
     ALTER TABLE "SpeakingClubEvent"
       ADD CONSTRAINT "SpeakingClubEvent_conversationPartnerId_fkey"
       FOREIGN KEY ("conversationPartnerId") REFERENCES "ConversationPartnerProfile"("id")
       ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 76));
  }

  const roles = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
    `SELECT enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'Role' ORDER BY e.enumsortorder`
  );
  const rls = await prisma.$queryRawUnsafe<{ relname: string; relrowsecurity: boolean }[]>(
    `SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('ConversationPartnerApplication','ConversationPartnerProfile')`
  );
  console.log("Role values:", roles.map((r) => r.enumlabel).join(", "));
  console.log("RLS:", rls);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
