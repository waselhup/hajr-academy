-- Sprint 7B — Rating system extensions + Gamification
-- Idempotent: CREATE TYPE inside DO block, CREATE TABLE / INDEX IF NOT EXISTS,
-- ALTER ADD COLUMN IF NOT EXISTS for the TeacherRating extension.

-- =================== ENUMS ===================

DO $$ BEGIN
  CREATE TYPE "TeacherRatingKind" AS ENUM ('POST_SESSION', 'MONTHLY', 'PARENT_MONTHLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AgeTier" AS ENUM ('TIER_1_3', 'TIER_4_6', 'MIDDLE', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =================== TEACHERRATING EXTENSIONS ===================

ALTER TABLE "TeacherRating"
  ADD COLUMN IF NOT EXISTS "kind" "TeacherRatingKind" NOT NULL DEFAULT 'POST_SESSION';

ALTER TABLE "TeacherRating"
  ADD COLUMN IF NOT EXISTS "studentNoteForParent" TEXT;

ALTER TABLE "TeacherRating"
  ADD COLUMN IF NOT EXISTS "improved" TEXT;

ALTER TABLE "TeacherRating"
  ADD COLUMN IF NOT EXISTS "month" INTEGER;

ALTER TABLE "TeacherRating"
  ADD COLUMN IF NOT EXISTS "year" INTEGER;

CREATE INDEX IF NOT EXISTS "TeacherRating_kind_createdAt_idx"
  ON "TeacherRating"("kind", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "teacherRating_monthly_uniq"
  ON "TeacherRating"("teacherId", "raterId", "kind", "year", "month");

-- =================== GAMIFICATION ===================

CREATE TABLE IF NOT EXISTS "StudentGamification" (
  "id"             TEXT PRIMARY KEY,
  "studentId"      TEXT NOT NULL UNIQUE,
  "xp"             INTEGER NOT NULL DEFAULT 0,
  "level"          INTEGER NOT NULL DEFAULT 1,
  "streakDays"     INTEGER NOT NULL DEFAULT 0,
  "lastActiveDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ageTier"        "AgeTier" NOT NULL DEFAULT 'MIDDLE',
  "avatarFrame"    TEXT NOT NULL DEFAULT 'none',
  "title"          TEXT NOT NULL DEFAULT '',
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "StudentGamification_xp_idx" ON "StudentGamification"("xp");
CREATE INDEX IF NOT EXISTS "StudentGamification_level_idx" ON "StudentGamification"("level");

CREATE TABLE IF NOT EXISTS "Achievement" (
  "id"            TEXT PRIMARY KEY,
  "key"           TEXT NOT NULL UNIQUE,
  "nameAr"        TEXT NOT NULL,
  "nameEn"        TEXT NOT NULL,
  "descriptionAr" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "iconKey"       TEXT NOT NULL,
  "xpReward"      INTEGER NOT NULL DEFAULT 10,
  "ageTier"       "AgeTier",
  "category"      TEXT NOT NULL,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StudentAchievement" (
  "id"            TEXT PRIMARY KEY,
  "studentId"     TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "earnedAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "isClaimed"     BOOLEAN NOT NULL DEFAULT FALSE,
  "claimedAt"     TIMESTAMP,
  CONSTRAINT "StudentAchievement_gamification_fk"
    FOREIGN KEY ("studentId") REFERENCES "StudentGamification"("studentId") ON DELETE CASCADE,
  CONSTRAINT "StudentAchievement_achievement_fk"
    FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentAchievement_studentId_achievementId_key"
  ON "StudentAchievement"("studentId", "achievementId");
CREATE INDEX IF NOT EXISTS "StudentAchievement_studentId_earnedAt_idx"
  ON "StudentAchievement"("studentId", "earnedAt");
