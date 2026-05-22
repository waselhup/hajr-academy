-- ─────────────────────────────────────────────────────────────
-- Communication System migration — ContactSubmission, Message
-- attachment + moderation fields, and the chat-attachments bucket.
--
-- Idempotent: safe to run repeatedly.
-- Apply via:  npx tsx prisma/apply-communication.ts
-- ─────────────────────────────────────────────────────────────

-- ContactStatus enum
DO $$ BEGIN
  CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'REPLIED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ContactSubmission table
CREATE TABLE IF NOT EXISTS "ContactSubmission" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "phone"     TEXT,
  "subject"   TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "status"    "ContactStatus" NOT NULL DEFAULT 'NEW',
  "source"    TEXT NOT NULL DEFAULT 'contact_form',
  "repliedBy" TEXT,
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ContactSubmission_status_createdAt_idx"
  ON "ContactSubmission" ("status", "createdAt");

-- Message — chat attachment columns
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachmentUrl"  TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachmentType" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER;

-- Message — admin moderation columns
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "flagged"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "flagReason"  TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "flaggedById" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "flaggedAt"   TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Message_threadId_createdAt_idx"
  ON "Message" ("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_flagged_idx"
  ON "Message" ("flagged");

-- chat-attachments storage bucket (private, 5 MB, images + PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  5242880,
  ARRAY['image/png','image/jpeg','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;
