-- Lab Studio v2 — ADDITIVE, backward-compatible migration (already applied to
-- prod via Prisma $executeRawUnsafe). Legacy LabExercise rows default to
-- audience=LIBRARY and keep working. Apply before deploying the code.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LabAudience') THEN
    CREATE TYPE "LabAudience" AS ENUM ('LIBRARY', 'ALL_CLASS', 'SELECTED');
  END IF;
END $$;

ALTER TABLE "LabExercise" ADD COLUMN IF NOT EXISTS "audience" "LabAudience" NOT NULL DEFAULT 'LIBRARY';
ALTER TABLE "LabExercise" ADD COLUMN IF NOT EXISTS "classId" TEXT;
ALTER TABLE "LabExercise" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "LabExercise" ADD COLUMN IF NOT EXISTS "assignedById" TEXT;
CREATE INDEX IF NOT EXISTS "LabExercise_classId_audience_idx" ON "LabExercise"("classId", "audience");

CREATE TABLE IF NOT EXISTS "LabExerciseTarget" (
  "id"         TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "studentId"  TEXT NOT NULL,
  CONSTRAINT "LabExerciseTarget_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LabExerciseTarget" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS "LabExerciseTarget_exerciseId_studentId_key" ON "LabExerciseTarget"("exerciseId", "studentId");
CREATE INDEX IF NOT EXISTS "LabExerciseTarget_studentId_idx" ON "LabExerciseTarget"("studentId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabExerciseTarget_exerciseId_fkey') THEN
    ALTER TABLE "LabExerciseTarget" ADD CONSTRAINT "LabExerciseTarget_exerciseId_fkey"
      FOREIGN KEY ("exerciseId") REFERENCES "LabExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabExerciseTarget_studentId_fkey') THEN
    ALTER TABLE "LabExerciseTarget" ADD CONSTRAINT "LabExerciseTarget_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
