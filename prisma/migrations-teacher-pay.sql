-- ─────────────────────────────────────────────────────────────
-- Teacher Pay migration — hourlyRate on TeacherProfile,
-- TeacherEarning table, EarningStatus enum.
--
-- Idempotent: safe to run repeatedly.
-- Apply via:  npx tsx prisma/apply-teacher-pay.ts
-- ─────────────────────────────────────────────────────────────

-- EarningStatus enum
DO $$ BEGIN
  CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- TeacherProfile — hourly rate (SAR per hour)
ALTER TABLE "TeacherProfile"
  ADD COLUMN IF NOT EXISTS "hourlyRate" DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- TeacherEarning table
CREATE TABLE IF NOT EXISTS "TeacherEarning" (
  "id"             TEXT PRIMARY KEY,
  "teacherId"      TEXT NOT NULL,
  "classSessionId" TEXT,
  "hoursWorked"    DECIMAL(5, 2) NOT NULL,
  "hourlyRate"     DECIMAL(10, 2) NOT NULL,
  "amount"         DECIMAL(10, 2) NOT NULL,
  "status"         "EarningStatus" NOT NULL DEFAULT 'PENDING',
  "approvedBy"     TEXT,
  "approvedAt"     TIMESTAMP(3),
  "paidAt"         TIMESTAMP(3),
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FK to TeacherProfile (cascade delete)
DO $$ BEGIN
  ALTER TABLE "TeacherEarning"
    ADD CONSTRAINT "TeacherEarning_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK to ClassSession (set null on delete so earning history survives)
DO $$ BEGIN
  ALTER TABLE "TeacherEarning"
    ADD CONSTRAINT "TeacherEarning_classSessionId_fkey"
    FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Uniqueness on classSessionId — one earning per session (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherEarning_classSessionId_key"
  ON "TeacherEarning" ("classSessionId");

CREATE INDEX IF NOT EXISTS "TeacherEarning_teacherId_status_idx"
  ON "TeacherEarning" ("teacherId", "status");

CREATE INDEX IF NOT EXISTS "TeacherEarning_status_createdAt_idx"
  ON "TeacherEarning" ("status", "createdAt");
