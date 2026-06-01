-- Applicant Portal — isolated new-teacher applicant account type.
-- Idempotent: enum value added with IF NOT EXISTS, CREATE TYPE in DO blocks,
-- CREATE TABLE / INDEX IF NOT EXISTS. RLS enabled with NO policies to match the
-- project-wide lockdown (data is reached only via the Prisma service connection,
-- which bypasses RLS; the anon/authenticated Supabase roles get deny-by-default).
-- Additive only — existing tables (TeacherApplication, etc.) are NOT touched.

-- =================== ROLE ENUM ===================

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'APPLICANT';

-- =================== APPLICANT ENUMS ===================

DO $$ BEGIN
  CREATE TYPE "ApplicantStage" AS ENUM ('NEW', 'MESSAGING', 'INTERVIEW', 'TESTING', 'DEMO', 'DECISION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApplicantFeature" AS ENUM ('OVERVIEW', 'OPENINGS', 'MESSAGING', 'MEETINGS', 'TEST', 'DEMO_RECORDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =================== APPLICANTPROFILE ===================

CREATE TABLE IF NOT EXISTS "ApplicantProfile" (
  "id"               TEXT PRIMARY KEY,
  "userId"           TEXT NOT NULL UNIQUE,
  "fullName"         TEXT NOT NULL,
  "phone"            TEXT,
  "appliedProgramId" TEXT,
  "stage"            "ApplicantStage" NOT NULL DEFAULT 'NEW',
  "gender"           "Gender",
  "isReadOnly"       BOOLEAN NOT NULL DEFAULT FALSE,
  "lastActivityAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "ApplicantProfile_userId_fk"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ApplicantProfile_appliedProgramId_fk"
    FOREIGN KEY ("appliedProgramId") REFERENCES "Program"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ApplicantProfile_stage_createdAt_idx"
  ON "ApplicantProfile"("stage", "createdAt");

-- =================== APPLICANTFEATUREACCESS ===================

CREATE TABLE IF NOT EXISTS "ApplicantFeatureAccess" (
  "id"          TEXT PRIMARY KEY,
  "applicantId" TEXT NOT NULL,
  "feature"     "ApplicantFeature" NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT FALSE,
  "enabledBy"   TEXT,
  "enabledAt"   TIMESTAMP,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "ApplicantFeatureAccess_applicantId_fk"
    FOREIGN KEY ("applicantId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApplicantFeatureAccess_applicantId_feature_key"
  ON "ApplicantFeatureAccess"("applicantId", "feature");
CREATE INDEX IF NOT EXISTS "ApplicantFeatureAccess_applicantId_enabled_idx"
  ON "ApplicantFeatureAccess"("applicantId", "enabled");

-- =================== RLS LOCKDOWN (enable, no policies) ===================

ALTER TABLE "ApplicantProfile"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicantFeatureAccess" ENABLE ROW LEVEL SECURITY;
