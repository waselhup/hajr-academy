-- Multi-Zoom-account feature — ADDITIVE, backward-compatible migration.
-- Apply BEFORE deploying the feat/zoom-accounts code (the meeting-start routes
-- include teacher.zoomAccount, which requires this table + column to exist).
-- Safe to run on the live DB ahead of the code deploy: existing code ignores
-- the new table/column.
--
-- Apply via Supabase MCP / SQL editor (local `prisma db push` can't reach the
-- pooler — see project note). Equivalent to `prisma db push` of schema.prisma.

CREATE TABLE IF NOT EXISTS "ZoomAccount" (
  "id"              TEXT NOT NULL,
  "label"           TEXT NOT NULL,
  "hostEmail"       TEXT NOT NULL,
  "accountId"       TEXT,
  "clientId"        TEXT,
  "clientSecretEnc" TEXT,
  "capacity"        INTEGER NOT NULL DEFAULT 6,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "lastCheckedAt"   TIMESTAMP(3),
  "lastCheckOk"     BOOLEAN,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZoomAccount_pkey" PRIMARY KEY ("id")
);

-- Match the project-wide RLS lockdown: enable RLS with no anon policies, so the
-- table is reachable only through the server (Prisma service role bypasses RLS).
ALTER TABLE "ZoomAccount" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "zoomAccountId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeacherProfile_zoomAccountId_fkey'
  ) THEN
    ALTER TABLE "TeacherProfile"
      ADD CONSTRAINT "TeacherProfile_zoomAccountId_fkey"
      FOREIGN KEY ("zoomAccountId") REFERENCES "ZoomAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
