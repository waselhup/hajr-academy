-- Sprint 3 Migration: Tickets / Readiness / Meetings / Ratings / Teacher Profile extensions
-- IDEMPOTENT — safe to re-run.

-- ─────────── ENUMS ───────────
DO $$ BEGIN
  CREATE TYPE "TicketCategory" AS ENUM ('TECHNICAL','FINANCIAL','PEDAGOGICAL','SUGGESTION','GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TicketPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED','LIVE','ENDED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────── TeacherProfile extensions ───────────
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "introVideoUrl" TEXT;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "yearsExp" INTEGER DEFAULT 0;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "responseTimeMinutesAvg" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_publicSlug_key" ON "TeacherProfile"("publicSlug");

-- ─────────── Ticket table ───────────
CREATE TABLE IF NOT EXISTS "Ticket" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "requesterRole" "Role" NOT NULL,
  "category" "TicketCategory" NOT NULL DEFAULT 'GENERAL',
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "assignedToId" TEXT,
  "aiCategorized" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Ticket_requesterId_status_idx" ON "Ticket"("requesterId","status");
CREATE INDEX IF NOT EXISTS "Ticket_assignedToId_status_idx" ON "Ticket"("assignedToId","status");
CREATE INDEX IF NOT EXISTS "Ticket_status_priority_createdAt_idx" ON "Ticket"("status","priority","createdAt");

-- ─────────── TicketReply table ───────────
CREATE TABLE IF NOT EXISTS "TicketReply" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorRole" "Role" NOT NULL,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "attachmentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "TicketReply_ticketId_createdAt_idx" ON "TicketReply"("ticketId","createdAt");

-- ─────────── TeacherReadiness table ───────────
CREATE TABLE IF NOT EXISTS "TeacherReadiness" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "zoomTested" BOOLEAN NOT NULL DEFAULT false,
  "digitalToolsOk" BOOLEAN NOT NULL DEFAULT false,
  "mockClassDone" BOOLEAN NOT NULL DEFAULT false,
  "interactiveOk" BOOLEAN NOT NULL DEFAULT false,
  "classroomMgmt" BOOLEAN NOT NULL DEFAULT false,
  "selfRating" INTEGER,
  "adminVerified" BOOLEAN NOT NULL DEFAULT false,
  "adminNotes" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherReadiness_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherReadiness_teacherId_key" ON "TeacherReadiness"("teacherId");

DO $$ BEGIN
  ALTER TABLE "TeacherReadiness" ADD CONSTRAINT "TeacherReadiness_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────── TeacherMeeting table ───────────
CREATE TABLE IF NOT EXISTS "TeacherMeeting" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "description" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMin" INTEGER NOT NULL DEFAULT 60,
  "agenda" TEXT,
  "agendaAr" TEXT,
  "minutes" TEXT,
  "actionItems" JSONB,
  "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "zoomMeetingId" TEXT,
  "zoomJoinUrl" TEXT,
  "calendarEventId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherMeeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherMeeting_calendarEventId_key" ON "TeacherMeeting"("calendarEventId");
CREATE INDEX IF NOT EXISTS "TeacherMeeting_scheduledAt_status_idx" ON "TeacherMeeting"("scheduledAt","status");

-- ─────────── TeacherMeetingAttendee table ───────────
CREATE TABLE IF NOT EXISTS "TeacherMeetingAttendee" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "attended" BOOLEAN NOT NULL DEFAULT false,
  "rsvpStatus" TEXT,
  "notes" TEXT,
  CONSTRAINT "TeacherMeetingAttendee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherMeetingAttendee_meetingId_teacherId_key" ON "TeacherMeetingAttendee"("meetingId","teacherId");

DO $$ BEGIN
  ALTER TABLE "TeacherMeetingAttendee" ADD CONSTRAINT "TeacherMeetingAttendee_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "TeacherMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherMeetingAttendee" ADD CONSTRAINT "TeacherMeetingAttendee_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────── TeacherRating table ───────────
CREATE TABLE IF NOT EXISTS "TeacherRating" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "raterId" TEXT NOT NULL,
  "raterRole" "Role" NOT NULL,
  "sessionId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "isApproved" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherRating_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeacherRating_teacherId_createdAt_idx" ON "TeacherRating"("teacherId","createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherRating_teacherId_raterId_sessionId_key" ON "TeacherRating"("teacherId","raterId","sessionId");

DO $$ BEGIN
  ALTER TABLE "TeacherRating" ADD CONSTRAINT "TeacherRating_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherRating" ADD CONSTRAINT "TeacherRating_raterId_fkey"
    FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
