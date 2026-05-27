-- ════════════════════════════════════════════════════════════════
-- HAJR A° Academy — SPRINT 2 migration
-- Additive only. Idempotent (safe to re-run).
--   1. PackageType extensions: STEP_PREP_PKG, IELTS_PREP_PKG
--   2. AttemptStatus extension: SUBMITTED
--   3. NotificationType extensions: MARKETER_UPDATE, COMMISSION_UPDATE, PLACEMENT_RESULT
--   4. New enums: MarketerStatus, CommissionStatus, PlacementVariant, PlacementSectionType
--   5. User cols: referredByCode, referredAt
--   6. New tables: MarketerProfile, MarketerReferral, Commission,
--      PlacementTest, PlacementSection, PlacementAttempt, PlacementResult
-- ════════════════════════════════════════════════════════════════

-- 1. PackageType enum: append new values
ALTER TYPE "PackageType" ADD VALUE IF NOT EXISTS 'STEP_PREP_PKG';
ALTER TYPE "PackageType" ADD VALUE IF NOT EXISTS 'IELTS_PREP_PKG';

-- 2. AttemptStatus: append SUBMITTED
ALTER TYPE "AttemptStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';

-- 3. NotificationType: append new values
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MARKETER_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMISSION_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLACEMENT_RESULT';

-- 4. New enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketerStatus') THEN
    CREATE TYPE "MarketerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionStatus') THEN
    CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlacementVariant') THEN
    CREATE TYPE "PlacementVariant" AS ENUM ('GENERAL_ENGLISH', 'STEP_PREP', 'IELTS_PREP');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlacementSectionType') THEN
    CREATE TYPE "PlacementSectionType" AS ENUM ('READING', 'GRAMMAR', 'VOCAB', 'LISTENING', 'SPEAKING');
  END IF;
END $$;

-- 5. User columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredByCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredAt" TIMESTAMP(3);

-- 6. MarketerProfile
CREATE TABLE IF NOT EXISTS "MarketerProfile" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "referralCode"   TEXT NOT NULL,
  "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
  "totalEarned"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalPaid"      DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status"         "MarketerStatus" NOT NULL DEFAULT 'PENDING',
  "bankIban"       TEXT,
  "bankName"       TEXT,
  "bankHolder"     TEXT,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketerProfile_userId_key" ON "MarketerProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketerProfile_referralCode_key" ON "MarketerProfile"("referralCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketerProfile_userId_fkey'
  ) THEN
    ALTER TABLE "MarketerProfile"
      ADD CONSTRAINT "MarketerProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 7. MarketerReferral
CREATE TABLE IF NOT EXISTS "MarketerReferral" (
  "id"           TEXT NOT NULL,
  "marketerId"   TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "studentId"    TEXT,
  "contactEmail" TEXT,
  "registeredAt" TIMESTAMP(3),
  "converted"    BOOLEAN NOT NULL DEFAULT false,
  "convertedAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketerReferral_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketerReferral_marketerId_converted_idx" ON "MarketerReferral"("marketerId", "converted");
CREATE INDEX IF NOT EXISTS "MarketerReferral_code_idx" ON "MarketerReferral"("code");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketerReferral_marketerId_fkey'
  ) THEN
    ALTER TABLE "MarketerReferral"
      ADD CONSTRAINT "MarketerReferral_marketerId_fkey"
      FOREIGN KEY ("marketerId") REFERENCES "MarketerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketerReferral_studentId_fkey'
  ) THEN
    ALTER TABLE "MarketerReferral"
      ADD CONSTRAINT "MarketerReferral_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 8. Commission
CREATE TABLE IF NOT EXISTS "Commission" (
  "id"              TEXT NOT NULL,
  "marketerId"      TEXT NOT NULL,
  "studentId"       TEXT NOT NULL,
  "invoiceId"       TEXT NOT NULL,
  "amount"          DECIMAL(10,2) NOT NULL,
  "rateApplied"     DECIMAL(5,4) NOT NULL,
  "status"          "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "approvedBy"      TEXT,
  "approvedAt"      TIMESTAMP(3),
  "paidBy"          TEXT,
  "paidAt"          TIMESTAMP(3),
  "rejectedAt"      TIMESTAMP(3),
  "rejectionReason" TEXT,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Commission_invoiceId_key" ON "Commission"("invoiceId");
CREATE INDEX IF NOT EXISTS "Commission_marketerId_status_idx" ON "Commission"("marketerId", "status");
CREATE INDEX IF NOT EXISTS "Commission_status_createdAt_idx" ON "Commission"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Commission_marketerId_fkey'
  ) THEN
    ALTER TABLE "Commission"
      ADD CONSTRAINT "Commission_marketerId_fkey"
      FOREIGN KEY ("marketerId") REFERENCES "MarketerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Commission_studentId_fkey'
  ) THEN
    ALTER TABLE "Commission"
      ADD CONSTRAINT "Commission_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Commission_invoiceId_fkey'
  ) THEN
    ALTER TABLE "Commission"
      ADD CONSTRAINT "Commission_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 9. PlacementTest
CREATE TABLE IF NOT EXISTS "PlacementTest" (
  "id"            TEXT NOT NULL,
  "variant"       "PlacementVariant" NOT NULL DEFAULT 'GENERAL_ENGLISH',
  "titleEn"       TEXT NOT NULL,
  "titleAr"       TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionAr" TEXT,
  "passingScore"  INTEGER NOT NULL DEFAULT 60,
  "durationMin"   INTEGER NOT NULL DEFAULT 30,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlacementTest_pkey" PRIMARY KEY ("id")
);

-- 10. PlacementSection
CREATE TABLE IF NOT EXISTS "PlacementSection" (
  "id"           TEXT NOT NULL,
  "testId"       TEXT NOT NULL,
  "type"         "PlacementSectionType" NOT NULL,
  "titleEn"      TEXT NOT NULL,
  "titleAr"      TEXT NOT NULL,
  "questions"    JSONB NOT NULL,
  "timeLimitMin" INTEGER NOT NULL DEFAULT 10,
  "order"        INTEGER NOT NULL DEFAULT 0,
  "maxScore"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PlacementSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlacementSection_testId_order_key" ON "PlacementSection"("testId", "order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlacementSection_testId_fkey'
  ) THEN
    ALTER TABLE "PlacementSection"
      ADD CONSTRAINT "PlacementSection_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "PlacementTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 11. PlacementAttempt
CREATE TABLE IF NOT EXISTS "PlacementAttempt" (
  "id"           TEXT NOT NULL,
  "testId"       TEXT NOT NULL,
  "studentId"    TEXT,
  "guestEmail"   TEXT,
  "guestName"    TEXT,
  "guestPhone"   TEXT,
  "answers"      JSONB NOT NULL,
  "score"        INTEGER,
  "maxScore"     INTEGER,
  "percent"      DECIMAL(5,2),
  "cefrLevel"    "CefrLevel",
  "status"       "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "sessionId"    TEXT,
  "sourceUtm"    TEXT,
  "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt"  TIMESTAMP(3),
  "timeSpentSec" INTEGER,
  CONSTRAINT "PlacementAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlacementAttempt_studentId_submittedAt_idx" ON "PlacementAttempt"("studentId", "submittedAt");
CREATE INDEX IF NOT EXISTS "PlacementAttempt_guestEmail_idx" ON "PlacementAttempt"("guestEmail");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlacementAttempt_testId_fkey'
  ) THEN
    ALTER TABLE "PlacementAttempt"
      ADD CONSTRAINT "PlacementAttempt_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "PlacementTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlacementAttempt_studentId_fkey'
  ) THEN
    ALTER TABLE "PlacementAttempt"
      ADD CONSTRAINT "PlacementAttempt_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 12. PlacementResult
CREATE TABLE IF NOT EXISTS "PlacementResult" (
  "id"               TEXT NOT NULL,
  "attemptId"        TEXT NOT NULL,
  "cefrLevel"        "CefrLevel" NOT NULL,
  "score"            INTEGER NOT NULL,
  "maxScore"         INTEGER NOT NULL,
  "percent"          DECIMAL(5,2) NOT NULL,
  "sectionBreakdown" JSONB NOT NULL,
  "recommendations"  JSONB NOT NULL,
  "pdfUrl"           TEXT,
  "pdfPath"          TEXT,
  "emailedTo"        TEXT,
  "emailedAt"        TIMESTAMP(3),
  "leadCreated"      BOOLEAN NOT NULL DEFAULT false,
  "leadId"           TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlacementResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlacementResult_attemptId_key" ON "PlacementResult"("attemptId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlacementResult_attemptId_fkey'
  ) THEN
    ALTER TABLE "PlacementResult"
      ADD CONSTRAINT "PlacementResult_attemptId_fkey"
      FOREIGN KEY ("attemptId") REFERENCES "PlacementAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
