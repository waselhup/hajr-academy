-- ════════════════════════════════════════════════════════════════
-- HAJR A° Academy — SPRINT 1 migration
-- Additive only. Idempotent (safe to re-run).
--   1. MARKETER value on Role enum
--   2. CalendarEventType enum
--   3. CalendarEvent table + indexes + FKs
-- ════════════════════════════════════════════════════════════════

-- 1. Role: append MARKETER value
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MARKETER';

-- 2. CalendarEventType enum (DO block — IF NOT EXISTS isn't supported for CREATE TYPE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarEventType') THEN
    CREATE TYPE "CalendarEventType" AS ENUM (
      'CLASS',
      'EXAM',
      'HOLIDAY',
      'MEETING',
      'PAYMENT_DUE',
      'PLACEMENT_TEST',
      'SPEAKING_CLUB',
      'DEADLINE',
      'CUSTOM'
    );
  END IF;
END $$;

-- 3. CalendarEvent table
CREATE TABLE IF NOT EXISTS "CalendarEvent" (
  "id"            TEXT NOT NULL,
  "type"          "CalendarEventType" NOT NULL,
  "title"         TEXT NOT NULL,
  "titleAr"       TEXT NOT NULL,
  "description"   TEXT,
  "descriptionAr" TEXT,
  "startAt"       TIMESTAMP(3) NOT NULL,
  "endAt"         TIMESTAMP(3) NOT NULL,
  "allDay"        BOOLEAN NOT NULL DEFAULT false,
  "userId"        TEXT,
  "classId"       TEXT,
  "teacherId"     TEXT,
  "studentId"     TEXT,
  "audienceRole"  "Role",
  "isGlobal"      BOOLEAN NOT NULL DEFAULT false,
  "metadata"      JSONB,
  "createdBy"     TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- 3b. Foreign keys (each guarded by NOT EXISTS check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_userId_fkey'
  ) THEN
    ALTER TABLE "CalendarEvent"
      ADD CONSTRAINT "CalendarEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_classId_fkey'
  ) THEN
    ALTER TABLE "CalendarEvent"
      ADD CONSTRAINT "CalendarEvent_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_teacherId_fkey'
  ) THEN
    ALTER TABLE "CalendarEvent"
      ADD CONSTRAINT "CalendarEvent_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_studentId_fkey'
  ) THEN
    ALTER TABLE "CalendarEvent"
      ADD CONSTRAINT "CalendarEvent_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3c. Indexes
CREATE INDEX IF NOT EXISTS "CalendarEvent_startAt_endAt_idx"
  ON "CalendarEvent" ("startAt", "endAt");
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_idx"
  ON "CalendarEvent" ("userId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_classId_idx"
  ON "CalendarEvent" ("classId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_teacherId_idx"
  ON "CalendarEvent" ("teacherId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_studentId_idx"
  ON "CalendarEvent" ("studentId");
