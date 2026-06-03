"use server";

/**
 * Assignment server actions — additive create/submit/grade flows that the
 * rich attachments hang off. Each is server-gated, audited, and notifies the
 * right party. Attachments are uploaded first (via /api/assignments/upload)
 * and their returned paths are passed in here to be persisted as rows.
 *
 * Nothing here changes existing grading math — gradeSubmissionAction simply
 * writes the grade/feedback the teacher already could not set through any UI.
 */
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notify";
import type { AttachmentKind, AssignmentAudience } from "@prisma/client";
import { canAccessSubmission } from "@/lib/assignments/attachments";
import {
  isAssignmentVisibleToStudent,
  targetedStudentUserIds,
} from "@/lib/assignments/visibility";

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

/** Shape passed from the client after uploading each file. */
export interface AttachmentInput {
  kind: AttachmentKind;
  /** Storage path returned by /api/assignments/upload. */
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number | null;
}

const VALID_KINDS: AttachmentKind[] = ["VIDEO", "AUDIO", "TEXT", "FILE"];

/** Defensive server-side sanitize of the attachment list the client sends. */
function sanitizeAttachments(raw: unknown): AttachmentInput[] {
  if (!Array.isArray(raw)) return [];
  const out: AttachmentInput[] = [];
  for (const a of raw.slice(0, 20)) {
    if (!a || typeof a !== "object") continue;
    const x = a as Record<string, unknown>;
    const kind = x.kind as AttachmentKind;
    const path = typeof x.path === "string" ? x.path : "";
    if (!VALID_KINDS.includes(kind) || !path) continue;
    out.push({
      kind,
      path,
      fileName: typeof x.fileName === "string" ? x.fileName.slice(0, 160) : "attachment",
      mimeType: typeof x.mimeType === "string" ? x.mimeType.slice(0, 120) : "application/octet-stream",
      sizeBytes: Number.isFinite(Number(x.sizeBytes)) ? Number(x.sizeBytes) : 0,
      durationSec: x.durationSec == null ? null : Number(x.durationSec),
    });
  }
  return out;
}

// ─────────────────────────── TEACHER: create ───────────────────────────

export async function createAssignmentAction(input: {
  classId: string;
  title: string;
  titleAr?: string;
  description?: string;
  dueDate?: string | null;
  allowedResponseTypes?: AttachmentKind[];
  attachments?: AttachmentInput[];
  /** Opt-in targeting. Omitted/ALL_CLASS keeps whole-class behavior. */
  audience?: AssignmentAudience;
  /** StudentProfile ids — used only when audience=SELECTED. */
  studentIds?: string[];
}): Promise<Result<{ assignmentId: string }>> {
  const session = await requireRole("TEACHER");

  const title = (input.title ?? "").trim();
  if (title.length < 2) return { ok: false, error: "TITLE_REQUIRED" };

  // The class must belong to this teacher.
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return { ok: false, error: "NO_TEACHER" };

  const klass = await prisma.class.findFirst({
    where: { id: input.classId, teacherId: teacher.id },
    select: { id: true, name: true, nameAr: true },
  });
  if (!klass) return { ok: false, error: "CLASS_NOT_FOUND" };

  const allowed = (input.allowedResponseTypes ?? []).filter((k) => VALID_KINDS.includes(k));
  const atts = sanitizeAttachments(input.attachments);

  // ── Audience resolution ──────────────────────────────────────────────
  // Default to whole-class (backward-compatible). When SELECTED, the chosen
  // student-set MUST be a subset of this class's ACTIVE enrollments — we never
  // trust the client list; anything outside the class is rejected.
  const audience: AssignmentAudience = input.audience === "SELECTED" ? "SELECTED" : "ALL_CLASS";
  let targetStudentIds: string[] = [];
  if (audience === "SELECTED") {
    const requested = [...new Set((input.studentIds ?? []).filter((s) => typeof s === "string" && s))];
    if (requested.length === 0) return { ok: false, error: "NO_STUDENTS_SELECTED" };

    const activeEnrolled = await prisma.enrollment.findMany({
      where: { classId: klass.id, status: "ACTIVE", studentId: { in: requested } },
      select: { studentId: true },
    });
    const validIds = new Set(activeEnrolled.map((e) => e.studentId));
    // Any requested id not actively enrolled in THIS class is invalid.
    if (requested.some((id) => !validIds.has(id))) {
      return { ok: false, error: "STUDENT_NOT_IN_CLASS" };
    }
    targetStudentIds = requested;
  }

  let dueDate: Date | null = null;
  if (input.dueDate) {
    const d = new Date(input.dueDate);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  const assignment = await prisma.assignment.create({
    data: {
      classId: klass.id,
      title,
      titleAr: input.titleAr?.trim() || null,
      description: input.description?.trim() || null,
      dueDate,
      allowedResponseTypes: allowed,
      audience,
      attachmentList: {
        create: atts.map((a) => ({
          kind: a.kind,
          url: a.path,
          fileName: a.fileName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          durationSec: a.durationSec ?? null,
        })),
      },
      // Only SELECTED assignments get target rows; ALL_CLASS stays empty.
      ...(audience === "SELECTED"
        ? { targets: { create: targetStudentIds.map((studentId) => ({ studentId })) } }
        : {}),
    },
    select: { id: true },
  });

  await audit.mutation(session.user.id, "ASSIGNMENT_CREATED", "Assignment", assignment.id, {
    classId: klass.id,
    attachments: atts.length,
    allowedResponseTypes: allowed,
    audience,
    targetCount: audience === "SELECTED" ? targetStudentIds.length : null,
  });

  // Notify ONLY the intended students (whole class, or the selected set) —
  // a SELECTED assignment must never reach a non-targeted student (non-fatal).
  try {
    const userIds = await targetedStudentUserIds({
      classId: klass.id,
      audience,
      studentIds: targetStudentIds,
    });
    if (userIds.length > 0) {
      await notifyMany(userIds, {
        type: "SYSTEM_ANNOUNCEMENT",
        title: `New assignment: ${title}`,
        titleAr: `واجب جديد: ${input.titleAr?.trim() || title}`,
        body: `A new assignment was posted in ${klass.name}.`,
        bodyAr: `تم نشر واجب جديد في ${klass.nameAr ?? klass.name}.`,
        channels: ["inApp", "realtime"],
        actionUrl: `/student/assignments`,
        refType: "Assignment",
        refId: assignment.id,
      });
    }
  } catch (e) {
    console.error("[assignments] create notify failed (non-fatal):", e);
  }

  revalidatePath("/teacher/assignments");
  revalidatePath("/student/assignments");
  return { ok: true, assignmentId: assignment.id };
}

// ─────────────────────────── STUDENT: submit ───────────────────────────

export async function submitAssignmentAction(input: {
  assignmentId: string;
  content?: string;
  attachments?: AttachmentInput[];
}): Promise<Result<{ submissionId: string }>> {
  const session = await requireRole("STUDENT");

  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return { ok: false, error: "NO_STUDENT" };

  const assignment = await prisma.assignment.findUnique({
    where: { id: input.assignmentId },
    select: {
      id: true,
      classId: true,
      dueDate: true,
      title: true,
      class: { select: { teacher: { select: { userId: true } }, name: true } },
    },
  });
  if (!assignment) return { ok: false, error: "ASSIGNMENT_NOT_FOUND" };

  // Single source of truth for eligibility: requires an ACTIVE enrollment AND,
  // for SELECTED assignments, that this student is in the target set. A
  // non-targeted student is rejected here on the server even if they forge the
  // assignmentId — the UI never gates this alone.
  const visible = await isAssignmentVisibleToStudent(assignment.id, student.id);
  if (!visible) return { ok: false, error: "NOT_ELIGIBLE" };

  const content = (input.content ?? "").trim() || null;
  const atts = sanitizeAttachments(input.attachments);
  if (!content && atts.length === 0) return { ok: false, error: "EMPTY_SUBMISSION" };

  // Respect existing due/lock rules: once a submission has been GRADED it is
  // locked; resubmission before grading is allowed (existing behavior — we
  // do not change lock semantics, only enforce the graded lock).
  const existing = await prisma.submission.findFirst({
    where: { assignmentId: assignment.id, studentId: student.id },
    select: { id: true, grade: true },
  });
  if (existing?.grade != null) return { ok: false, error: "ALREADY_GRADED" };

  let submissionId: string;
  if (existing) {
    // Resubmit: replace attachments, refresh content + timestamp.
    await prisma.submissionAttachment.deleteMany({ where: { submissionId: existing.id } });
    await prisma.submission.update({
      where: { id: existing.id },
      data: {
        content,
        submittedAt: new Date(),
        attachmentList: {
          create: atts.map((a) => ({
            kind: a.kind,
            url: a.path,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            durationSec: a.durationSec ?? null,
          })),
        },
      },
    });
    submissionId = existing.id;
  } else {
    const created = await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        studentId: student.id,
        content,
        attachmentList: {
          create: atts.map((a) => ({
            kind: a.kind,
            url: a.path,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            durationSec: a.durationSec ?? null,
          })),
        },
      },
      select: { id: true },
    });
    submissionId = created.id;
  }

  await audit.mutation(session.user.id, "ASSIGNMENT_SUBMITTED", "Submission", submissionId, {
    assignmentId: assignment.id,
    attachments: atts.length,
    resubmission: !!existing,
  });

  // Notify the class teacher (non-fatal).
  try {
    const teacherUserId = assignment.class.teacher?.userId;
    if (teacherUserId) {
      await notify({
        userId: teacherUserId,
        type: "SYSTEM_ANNOUNCEMENT",
        title: `New submission: ${assignment.title}`,
        titleAr: `تسليم جديد: ${assignment.title}`,
        body: `A student submitted work for ${assignment.title}.`,
        bodyAr: `قام طالب بتسليم عمل في ${assignment.title}.`,
        channels: ["inApp", "realtime"],
        actionUrl: `/teacher/assignments/${assignment.id}`,
        refType: "Submission",
        refId: submissionId,
      });
    }
  } catch (e) {
    console.error("[assignments] submit notify failed (non-fatal):", e);
  }

  revalidatePath("/student/assignments");
  revalidatePath(`/teacher/assignments/${assignment.id}`);
  return { ok: true, submissionId };
}

// ─────────────────────────── TEACHER: grade ───────────────────────────

export async function gradeSubmissionAction(input: {
  submissionId: string;
  grade: number;
  feedback?: string;
}): Promise<Result> {
  const session = await requireRole("TEACHER");

  // Reuse the central access guard: only the owning class teacher may grade.
  const allowed = await canAccessSubmission(input.submissionId, {
    userId: session.user.id,
    role: session.user.role,
  });
  if (!allowed) return { ok: false, error: "FORBIDDEN" };

  const grade = Math.round(Number(input.grade));
  if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
    return { ok: false, error: "INVALID_GRADE" };
  }

  const submission = await prisma.submission.findUnique({
    where: { id: input.submissionId },
    select: {
      id: true,
      assignmentId: true,
      student: { select: { userId: true } },
      assignment: { select: { id: true, title: true } },
    },
  });
  if (!submission) return { ok: false, error: "NOT_FOUND" };

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      grade,
      feedback: input.feedback?.trim() || null,
      gradedAt: new Date(),
    },
  });

  await audit.mutation(session.user.id, "SUBMISSION_GRADED", "Submission", submission.id, {
    grade,
  });

  // Notify the student (non-fatal).
  try {
    await notify({
      userId: submission.student.userId,
      type: "SYSTEM_ANNOUNCEMENT",
      title: `Assignment graded: ${submission.assignment.title}`,
      titleAr: `تم تقييم الواجب: ${submission.assignment.title}`,
      body: `You scored ${grade}/100 on ${submission.assignment.title}.`,
      bodyAr: `حصلت على ${grade}/100 في ${submission.assignment.title}.`,
      channels: ["inApp", "realtime"],
      actionUrl: `/student/assignments`,
      refType: "Submission",
      refId: submission.id,
    });
  } catch (e) {
    console.error("[assignments] grade notify failed (non-fatal):", e);
  }

  revalidatePath(`/teacher/assignments/${submission.assignmentId}`);
  revalidatePath("/student/assignments");
  return { ok: true };
}
