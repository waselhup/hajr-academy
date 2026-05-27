-- Sprint 4 Migration: Retention & Trust
--   Parent Reports + Speaking Club + Certificates + Payment Requests
-- IDEMPOTENT — safe to re-run.

-- ─────────── ENUMS (additive — values added to existing NotificationType) ───────────
DO $$ BEGIN
  CREATE TYPE "EventStatus" AS ENUM ('UPCOMING','LIVE','ENDED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CertificateType" AS ENUM ('LEVEL_COMPLETION','COURSE_COMPLETION','PLACEMENT','ATTENDANCE','SPEAKING_CLUB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING','APPROVED','PAID','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────── Extend NotificationType enum (idempotent per value) ───────────
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PARENT_REPORT_READY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SPEAKING_CLUB_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SPEAKING_CLUB_REMINDER_24H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SPEAKING_CLUB_REMINDER_1H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SPEAKING_CLUB_LIVE_NOW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_ISSUED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_REVOKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_REQUEST_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_REQUEST_PAID';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_REQUEST_REJECTED';

-- ─────────── ParentReport ───────────
CREATE TABLE IF NOT EXISTS "ParentReport" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "parentId" TEXT,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "attendanceRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "sessionsAttended" INTEGER NOT NULL DEFAULT 0,
  "sessionsTotal" INTEGER NOT NULL DEFAULT 0,
  "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
  "homeworkCompleted" INTEGER NOT NULL DEFAULT 0,
  "homeworkTotal" INTEGER NOT NULL DEFAULT 0,
  "avgGrade" DECIMAL(5,2),
  "teacherNotes" TEXT,
  "levelBefore" TEXT,
  "levelAfter" TEXT,
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "recordingUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pdfUrl" TEXT,
  "pdfPath" TEXT,
  "shareImageUrl" TEXT,
  "shareImagePath" TEXT,
  "emailedAt" TIMESTAMP(3),
  "emailedTo" TEXT,
  "generatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentReport_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ParentReport" ADD CONSTRAINT "ParentReport_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ParentReport_studentId_year_month_key"
  ON "ParentReport"("studentId","year","month");
CREATE INDEX IF NOT EXISTS "ParentReport_year_month_idx"
  ON "ParentReport"("year","month");

-- ─────────── SpeakingClubEvent ───────────
CREATE TABLE IF NOT EXISTS "SpeakingClubEvent" (
  "id" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMin" INTEGER NOT NULL DEFAULT 60,
  "maxAttendees" INTEGER NOT NULL DEFAULT 30,
  "minLevel" TEXT,
  "hostTeacherId" TEXT,
  "zoomMeetingId" TEXT,
  "zoomJoinUrl" TEXT,
  "recordingUrl" TEXT,
  "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
  "calendarEventId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpeakingClubEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "SpeakingClubEvent" ADD CONSTRAINT "SpeakingClubEvent_hostTeacherId_fkey"
    FOREIGN KEY ("hostTeacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SpeakingClubEvent_calendarEventId_key"
  ON "SpeakingClubEvent"("calendarEventId");
CREATE INDEX IF NOT EXISTS "SpeakingClubEvent_scheduledAt_status_idx"
  ON "SpeakingClubEvent"("scheduledAt","status");

-- ─────────── SpeakingClubRSVP ───────────
CREATE TABLE IF NOT EXISTS "SpeakingClubRSVP" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "attended" BOOLEAN NOT NULL DEFAULT false,
  "rsvpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpeakingClubRSVP_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "SpeakingClubRSVP" ADD CONSTRAINT "SpeakingClubRSVP_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "SpeakingClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SpeakingClubRSVP" ADD CONSTRAINT "SpeakingClubRSVP_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SpeakingClubRSVP_eventId_studentId_key"
  ON "SpeakingClubRSVP"("eventId","studentId");
CREATE INDEX IF NOT EXISTS "SpeakingClubRSVP_studentId_attended_idx"
  ON "SpeakingClubRSVP"("studentId","attended");

-- ─────────── Certificate ───────────
CREATE TABLE IF NOT EXISTS "Certificate" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "type" "CertificateType" NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionAr" TEXT,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiryDate" TIMESTAMP(3),
  "cefrLevel" TEXT,
  "score" INTEGER,
  "pdfUrl" TEXT NOT NULL,
  "pdfPath" TEXT,
  "qrCodeUrl" TEXT,
  "verificationCode" TEXT NOT NULL,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "revokedReason" TEXT,
  "issuedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_verificationCode_key"
  ON "Certificate"("verificationCode");
CREATE INDEX IF NOT EXISTS "Certificate_studentId_type_idx"
  ON "Certificate"("studentId","type");
CREATE INDEX IF NOT EXISTS "Certificate_verificationCode_idx"
  ON "Certificate"("verificationCode");

-- ─────────── PaymentRequest ───────────
CREATE TABLE IF NOT EXISTS "PaymentRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "requesterRole" "Role" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidById" TEXT,
  "paidAt" TIMESTAMP(3),
  "paidMethod" TEXT,
  "paidReference" TEXT,
  "rejectedReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PaymentRequest_requesterId_status_idx"
  ON "PaymentRequest"("requesterId","status");
CREATE INDEX IF NOT EXISTS "PaymentRequest_status_createdAt_idx"
  ON "PaymentRequest"("status","createdAt");

-- ─────────── Storage Buckets ───────────
-- parent-reports: private, 10 MB, image/pdf
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parent-reports',
  'parent-reports',
  false,
  10485760,
  ARRAY['application/pdf','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- certificates: public, 5 MB, image/pdf
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  5242880,
  ARRAY['application/pdf','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- share-images: public, 2 MB, image/png
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'share-images',
  'share-images',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;
