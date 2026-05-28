/**
 * Capture screenshots for the user manuals.
 *
 * Run with:
 *   npx tsx scripts/capture-manual-screenshots.ts
 *
 * Requires the dev server to be running on http://localhost:3000.
 * Best-effort: if Playwright browsers are not installed or the dev
 * server is unreachable, the script logs and exits 0 — the manuals
 * gracefully fall back to placeholder rectangles.
 */
import { captureBatch, type CaptureJob } from "../src/lib/manuals/screenshot";
import { resolve } from "node:path";

const BASE_URL = process.env.MANUAL_BASE_URL || "http://localhost:3000";
const PUBLIC_DIR = resolve(process.cwd(), "public");

const ADMIN_JOBS: CaptureJob[] = [
  { slug: "01-login", url: `${BASE_URL}/en/login`, loginAs: "admin" },
  { slug: "02-dashboard", url: `${BASE_URL}/en/admin`, loginAs: "admin" },
  { slug: "03-students", url: `${BASE_URL}/en/admin/students`, loginAs: "admin" },
  { slug: "04-teachers", url: `${BASE_URL}/en/admin/teachers`, loginAs: "admin" },
  { slug: "05-parents", url: `${BASE_URL}/en/admin/parents`, loginAs: "admin" },
  { slug: "06-classes", url: `${BASE_URL}/en/admin/classes`, loginAs: "admin" },
  { slug: "07-schedule", url: `${BASE_URL}/en/admin/schedule`, loginAs: "admin" },
  { slug: "08-finance", url: `${BASE_URL}/en/admin/finance`, loginAs: "admin" },
  { slug: "09-payment-requests", url: `${BASE_URL}/en/admin/payment-requests`, loginAs: "admin" },
  { slug: "10-communications", url: `${BASE_URL}/en/admin/communications`, loginAs: "admin" },
  { slug: "11-test-bank", url: `${BASE_URL}/en/admin/test-bank`, loginAs: "admin" },
  { slug: "12-exams", url: `${BASE_URL}/en/admin/exams`, loginAs: "admin" },
  { slug: "13-lab", url: `${BASE_URL}/en/admin/lab`, loginAs: "admin" },
  { slug: "14-blackboards", url: `${BASE_URL}/en/admin/blackboards`, loginAs: "admin" },
  { slug: "15-placement", url: `${BASE_URL}/en/admin/placement-tests`, loginAs: "admin" },
  { slug: "16-marketers", url: `${BASE_URL}/en/admin/marketers`, loginAs: "admin" },
  { slug: "17-certificates", url: `${BASE_URL}/en/admin/certificates`, loginAs: "admin" },
  { slug: "18-speaking-club", url: `${BASE_URL}/en/admin/speaking-club`, loginAs: "admin" },
  { slug: "19-tickets", url: `${BASE_URL}/en/admin/tickets`, loginAs: "admin" },
  { slug: "20-brand-kit", url: `${BASE_URL}/en/admin/brand-kit`, loginAs: "admin" },
  { slug: "21-delivery", url: `${BASE_URL}/en/admin/delivery`, loginAs: "admin" },
  { slug: "22-validation", url: `${BASE_URL}/en/admin/validation`, loginAs: "admin" },
  { slug: "23-audit-log", url: `${BASE_URL}/en/admin/audit-log`, loginAs: "admin" },
  { slug: "24-settings", url: `${BASE_URL}/en/admin/settings`, loginAs: "admin" },
  { slug: "25-recordings", url: `${BASE_URL}/en/admin/recordings`, loginAs: "admin" },
  { slug: "26-teacher-activity", url: `${BASE_URL}/en/admin/teacher-activity`, loginAs: "admin" },
  { slug: "27-teacher-meetings", url: `${BASE_URL}/en/admin/teacher-meetings`, loginAs: "admin" },
  { slug: "28-ai", url: `${BASE_URL}/en/admin/ai`, loginAs: "admin" },
  { slug: "29-step-bank", url: `${BASE_URL}/en/admin/step-bank`, loginAs: "admin" },
  { slug: "30-schools", url: `${BASE_URL}/en/admin/schools`, loginAs: "admin" },
];

const TEACHER_JOBS: CaptureJob[] = [
  { slug: "01-login", url: `${BASE_URL}/en/login`, loginAs: "teacher" },
  { slug: "02-dashboard", url: `${BASE_URL}/en/teacher`, loginAs: "teacher" },
  { slug: "03-classes", url: `${BASE_URL}/en/teacher/classes`, loginAs: "teacher" },
  { slug: "04-students", url: `${BASE_URL}/en/teacher/students`, loginAs: "teacher" },
  { slug: "05-attendance", url: `${BASE_URL}/en/teacher/attendance`, loginAs: "teacher" },
  { slug: "06-messages", url: `${BASE_URL}/en/messages`, loginAs: "teacher" },
  { slug: "07-blackboards", url: `${BASE_URL}/en/teacher/blackboards`, loginAs: "teacher" },
  { slug: "08-ai-summary", url: `${BASE_URL}/en/teacher/lesson-summaries`, loginAs: "teacher" },
  { slug: "09-readiness", url: `${BASE_URL}/en/teacher/readiness`, loginAs: "teacher" },
  { slug: "10-meetings", url: `${BASE_URL}/en/teacher/meetings`, loginAs: "teacher" },
  { slug: "11-earnings", url: `${BASE_URL}/en/teacher/earnings`, loginAs: "teacher" },
  { slug: "12-payment-request", url: `${BASE_URL}/en/teacher/payment-requests`, loginAs: "teacher" },
  { slug: "13-tickets", url: `${BASE_URL}/en/teacher/tickets`, loginAs: "teacher" },
  { slug: "14-profile", url: `${BASE_URL}/en/teacher/profile`, loginAs: "teacher" },
  { slug: "15-calendar", url: `${BASE_URL}/en/calendar`, loginAs: "teacher" },
];

const STUDENT_JOBS: CaptureJob[] = [
  { slug: "01-login", url: `${BASE_URL}/en/login`, loginAs: "student" },
  { slug: "02-dashboard", url: `${BASE_URL}/en/student`, loginAs: "student" },
  { slug: "03-classes", url: `${BASE_URL}/en/student/classes`, loginAs: "student" },
  { slug: "04-assignments", url: `${BASE_URL}/en/student/assignments`, loginAs: "student" },
  { slug: "05-lab", url: `${BASE_URL}/en/student/lab`, loginAs: "student" },
  { slug: "06-exams", url: `${BASE_URL}/en/student/exams`, loginAs: "student" },
  { slug: "07-messages", url: `${BASE_URL}/en/messages`, loginAs: "student" },
  { slug: "08-placement", url: `${BASE_URL}/en/placement`, loginAs: "student" },
  { slug: "09-speaking-club", url: `${BASE_URL}/en/speaking-club`, loginAs: "student" },
  { slug: "10-certificates", url: `${BASE_URL}/en/student/certificates`, loginAs: "student" },
  { slug: "11-billing", url: `${BASE_URL}/en/student/billing`, loginAs: "student" },
  { slug: "12-calendar", url: `${BASE_URL}/en/calendar`, loginAs: "student" },
];

async function main() {
  console.log("Capturing manual screenshots — best-effort.");
  console.log(`Base URL: ${BASE_URL}`);

  const adminResult = await captureBatch("admin", ADMIN_JOBS, PUBLIC_DIR);
  console.log(
    `Admin: captured=${adminResult.captured} skipped=${adminResult.skipped} failed=${adminResult.failed}`
  );

  const teacherResult = await captureBatch("teacher", TEACHER_JOBS, PUBLIC_DIR);
  console.log(
    `Teacher: captured=${teacherResult.captured} skipped=${teacherResult.skipped} failed=${teacherResult.failed}`
  );

  const studentResult = await captureBatch("student", STUDENT_JOBS, PUBLIC_DIR);
  console.log(
    `Student: captured=${studentResult.captured} skipped=${studentResult.skipped} failed=${studentResult.failed}`
  );

  console.log("Done. Missing screenshots render as placeholder boxes in the manual.");
}

main().catch((err) => {
  console.error("Capture failed (non-fatal):", err.message);
  process.exit(0);
});
