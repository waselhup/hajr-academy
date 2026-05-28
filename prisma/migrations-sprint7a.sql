-- Sprint 7A — Library + Tech Check + Activity Analytics
-- Idempotent: CREATE TABLE / CREATE INDEX IF NOT EXISTS + DO blocks for enums.

-- =================== ENUMS ===================

DO $$ BEGIN
  CREATE TYPE "LibraryItemType" AS ENUM ('ARTICLE', 'VIDEO', 'EXERCISE', 'AUDIO', 'PDF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LibrarySkillLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'ALL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LibraryAgeTier" AS ENUM ('TIER_1_3', 'TIER_4_6', 'MIDDLE', 'HIGH', 'ALL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LibraryProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =================== LIBRARY ===================

CREATE TABLE IF NOT EXISTS "LibraryItem" (
  "id"              TEXT PRIMARY KEY,
  "title"           TEXT NOT NULL,
  "titleAr"         TEXT NOT NULL,
  "description"     TEXT,
  "descriptionAr"   TEXT,
  "type"            "LibraryItemType" NOT NULL,
  "skillLevel"      "LibrarySkillLevel" NOT NULL DEFAULT 'ALL',
  "targetAgeTier"   "LibraryAgeTier" NOT NULL DEFAULT 'ALL',
  "contentUrl"      TEXT,
  "contentHtml"     TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 5,
  "thumbnailUrl"    TEXT,
  "authorId"        TEXT,
  "isPublished"     BOOLEAN NOT NULL DEFAULT FALSE,
  "publishedAt"     TIMESTAMP,
  "viewCount"       INTEGER NOT NULL DEFAULT 0,
  "exerciseData"    JSONB,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LibraryItem_type_isPublished_idx" ON "LibraryItem"("type", "isPublished");
CREATE INDEX IF NOT EXISTS "LibraryItem_targetAgeTier_skillLevel_idx" ON "LibraryItem"("targetAgeTier", "skillLevel");
CREATE INDEX IF NOT EXISTS "LibraryItem_authorId_idx" ON "LibraryItem"("authorId");

CREATE TABLE IF NOT EXISTS "LibraryItemTag" (
  "id"     TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "tag"    TEXT NOT NULL,
  CONSTRAINT "LibraryItemTag_item_fk"
    FOREIGN KEY ("itemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibraryItemTag_itemId_tag_key" ON "LibraryItemTag"("itemId", "tag");
CREATE INDEX IF NOT EXISTS "LibraryItemTag_tag_idx" ON "LibraryItemTag"("tag");

CREATE TABLE IF NOT EXISTS "LibraryProgress" (
  "id"            TEXT PRIMARY KEY,
  "studentId"     TEXT NOT NULL,
  "libraryItemId" TEXT NOT NULL,
  "status"        "LibraryProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progressPct"   INTEGER NOT NULL DEFAULT 0,
  "timeSpentSec"  INTEGER NOT NULL DEFAULT 0,
  "lastAccessAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "completedAt"   TIMESTAMP,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "LibraryProgress_libraryItem_fk"
    FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibraryProgress_studentId_libraryItemId_key"
  ON "LibraryProgress"("studentId", "libraryItemId");
CREATE INDEX IF NOT EXISTS "LibraryProgress_studentId_status_idx" ON "LibraryProgress"("studentId", "status");

CREATE TABLE IF NOT EXISTS "LibraryExerciseAttempt" (
  "id"            TEXT PRIMARY KEY,
  "libraryItemId" TEXT NOT NULL,
  "studentId"     TEXT NOT NULL,
  "score"         INTEGER NOT NULL DEFAULT 0,
  "answersJson"   JSONB NOT NULL,
  "completedAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "LibraryExerciseAttempt_libraryItem_fk"
    FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "LibraryExerciseAttempt_studentId_completedAt_idx"
  ON "LibraryExerciseAttempt"("studentId", "completedAt");
CREATE INDEX IF NOT EXISTS "LibraryExerciseAttempt_libraryItemId_idx"
  ON "LibraryExerciseAttempt"("libraryItemId");

-- =================== TECH CHECK ===================

CREATE TABLE IF NOT EXISTS "TechCheck" (
  "id"             TEXT PRIMARY KEY,
  "teacherId"      TEXT NOT NULL,
  "sessionId"      TEXT,
  "downloadMbps"   DECIMAL(6,2) NOT NULL,
  "uploadMbps"     DECIMAL(6,2) NOT NULL,
  "latencyMs"      INTEGER NOT NULL,
  "audioPeakDb"    DECIMAL(5,2) NOT NULL,
  "cameraOk"       BOOLEAN NOT NULL,
  "micOk"          BOOLEAN NOT NULL,
  "score"          INTEGER NOT NULL,
  "passed"         BOOLEAN NOT NULL,
  "failureReasons" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "TechCheck_teacherId_createdAt_idx" ON "TechCheck"("teacherId", "createdAt");
CREATE INDEX IF NOT EXISTS "TechCheck_passed_createdAt_idx" ON "TechCheck"("passed", "createdAt");

-- =================== USER SESSION + PAGE VISIT ===================

CREATE TABLE IF NOT EXISTS "UserSession" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL,
  "role"          "Role" NOT NULL,
  "startedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "endedAt"       TIMESTAMP,
  "ipHash"        TEXT,
  "userAgentHash" TEXT,
  "durationSec"   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "UserSession_userId_startedAt_idx" ON "UserSession"("userId", "startedAt");
CREATE INDEX IF NOT EXISTS "UserSession_startedAt_idx" ON "UserSession"("startedAt");
CREATE INDEX IF NOT EXISTS "UserSession_endedAt_idx" ON "UserSession"("endedAt");

CREATE TABLE IF NOT EXISTS "PageVisit" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "sessionId"   TEXT,
  "route"       TEXT NOT NULL,
  "enteredAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "leftAt"      TIMESTAMP,
  "durationSec" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PageVisit_session_fk"
    FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "PageVisit_userId_enteredAt_idx" ON "PageVisit"("userId", "enteredAt");
CREATE INDEX IF NOT EXISTS "PageVisit_route_enteredAt_idx" ON "PageVisit"("route", "enteredAt");
CREATE INDEX IF NOT EXISTS "PageVisit_sessionId_idx" ON "PageVisit"("sessionId");
