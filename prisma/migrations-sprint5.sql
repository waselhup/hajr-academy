-- Sprint 5 — AI Lesson Summaries + Brand Kit Assets
-- Idempotent: uses CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "LessonSummary" (
  "id"               TEXT PRIMARY KEY,
  "sessionId"        TEXT NOT NULL UNIQUE,
  "transcript"       TEXT,
  "summaryEn"        TEXT NOT NULL,
  "summaryAr"        TEXT NOT NULL,
  "keyVocab"         JSONB,
  "grammarPoints"    JSONB,
  "homework"         TEXT,
  "homeworkAr"       TEXT,
  "teacherActions"   TEXT,
  "teacherActionsAr" TEXT,
  "confidence"       DECIMAL(3,2),
  "generatedById"    TEXT,
  "generatedAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "LessonSummary_session_fk"
    FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "LessonSummary_sessionId_idx" ON "LessonSummary"("sessionId");

CREATE TABLE IF NOT EXISTS "BrandKitAsset" (
  "id"            TEXT PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "nameAr"        TEXT NOT NULL,
  "type"          TEXT NOT NULL,
  "category"      TEXT NOT NULL,
  "url"           TEXT NOT NULL,
  "downloadUrl"   TEXT NOT NULL,
  "description"   TEXT,
  "descriptionAr" TEXT,
  "sortOrder"     INTEGER NOT NULL DEFAULT 0,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "BrandKitAsset_category_sortOrder_idx"
  ON "BrandKitAsset"("category", "sortOrder");
