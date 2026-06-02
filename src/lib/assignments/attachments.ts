/**
 * Rich assignment/submission attachments — shared server logic.
 *
 * Both teachers and students attach media: a teacher's assignment material
 * (AssignmentAttachment) and a student's response (SubmissionAttachment) use
 * the same generic shape (kind/url/fileName/mimeType/sizeBytes/durationSec).
 *
 * Storage: the private `assignment-media` bucket. We persist the storage
 * PATH in `url`; the access-controlled fetch endpoint signs it on demand so
 * a leaked link cannot be replayed indefinitely.
 *
 * SECURITY/PDPL: access to any attachment is decided **server-side only** by
 * `canAccessAssignment` / `canAccessSubmission` — the owning teacher, the
 * enrolled student, and admins. Never trust the client.
 */
import type { AttachmentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminish } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export const ASSIGNMENT_BUCKET = "assignment-media";

/** Per-file ceiling — mirrors the chat-attachment limit used elsewhere. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB for docs/images
/** Recorded media can be larger; mirrors the lab-audio ceiling. */
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50 MB for audio/video

/** Client-side duration caps (also re-checked here, defensively). */
export const MAX_VIDEO_SEC = 5 * 60; // 5 minutes
export const MAX_VOICE_SEC = 3 * 60; // 3 minutes

// ──────────────────────── MIME / magic bytes ────────────────────────

const VIDEO_MAGIC: Array<{ mime: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  // WebM / Matroska: 1A 45 DF A3
  { mime: "video/webm", ext: "webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  // MP4 / MOV / M4V: "....ftyp"
  { mime: "video/mp4", ext: "mp4", test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
  // OGG container (Theora video): "OggS"
  { mime: "video/ogg", ext: "ogv", test: (b) => b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53 },
];

const AUDIO_MAGIC: Array<{ mime: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  { mime: "audio/webm", ext: "webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { mime: "audio/ogg", ext: "ogg", test: (b) => b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53 },
  {
    mime: "audio/wav",
    ext: "wav",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45,
  },
  { mime: "audio/mpeg", ext: "mp3", test: (b) => b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33 },
  { mime: "audio/mpeg", ext: "mp3", test: (b) => b[0] === 0xff && (b[1] === 0xfb || b[1] === 0xf3 || b[1] === 0xf2) },
  // M4A audio: "....ftyp" — only when video sniffing didn't already claim it.
  { mime: "audio/mp4", ext: "m4a", test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
];

const FILE_MAGIC: Array<{ mime: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { mime: "image/gif", ext: "gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  // ZIP-based Office docs (docx/xlsx/pptx) + plain zip: "PK\x03\x04"
  { mime: "application/zip", ext: "zip", test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 },
  // Legacy Office (doc/xls/ppt) OLE2: D0 CF 11 E0
  { mime: "application/x-ole-storage", ext: "bin", test: (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 },
];

export interface DetectedFile {
  kind: AttachmentKind;
  mime: string;
  ext: string;
}

/**
 * Sniff a file by magic bytes and classify it into an AttachmentKind.
 * `declaredKind` (from the multipart form) disambiguates the shared
 * webm/ogg/ftyp signatures between VIDEO and AUDIO. Returns null when the
 * bytes match nothing we accept.
 */
export function detectAttachment(
  buffer: Uint8Array,
  declaredKind: AttachmentKind | null,
  declaredMime?: string,
): DetectedFile | null {
  // For ambiguous container formats, honor the recorder's declared kind.
  if (declaredKind === "VIDEO") {
    const v = VIDEO_MAGIC.find((m) => m.test(buffer));
    if (v) return { kind: "VIDEO", mime: declaredMime?.startsWith("video/") ? declaredMime : v.mime, ext: v.ext };
  }
  if (declaredKind === "AUDIO") {
    const a = AUDIO_MAGIC.find((m) => m.test(buffer));
    if (a) return { kind: "AUDIO", mime: declaredMime?.startsWith("audio/") ? declaredMime : a.mime, ext: a.ext };
  }

  // Otherwise auto-classify: try video, audio, then generic files.
  const v = VIDEO_MAGIC.find((m) => m.test(buffer));
  if (v && declaredKind !== "FILE") return { kind: "VIDEO", mime: v.mime, ext: v.ext };
  const a = AUDIO_MAGIC.find((m) => m.test(buffer));
  if (a && declaredKind !== "FILE") return { kind: "AUDIO", mime: a.mime, ext: a.ext };
  const f = FILE_MAGIC.find((m) => m.test(buffer));
  if (f) return { kind: "FILE", mime: f.mime, ext: f.ext };

  return null;
}

/** Size ceiling depends on whether it's recorded media or a document. */
export function maxBytesFor(kind: AttachmentKind): number {
  return kind === "VIDEO" || kind === "AUDIO" ? MAX_MEDIA_BYTES : MAX_FILE_BYTES;
}

// ──────────────────────── Access control ────────────────────────

export interface Actor {
  userId: string;
  role: Role;
}

/**
 * Can this actor see a given assignment's material?
 *   - admins: always
 *   - the teacher who owns the class the assignment belongs to
 *   - a student with an ACTIVE enrollment in that class
 */
export async function canAccessAssignment(
  assignmentId: string,
  actor: Actor,
): Promise<boolean> {
  if (isAdminish(actor.role)) return true;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { classId: true, class: { select: { teacher: { select: { userId: true } } } } },
  });
  if (!assignment) return false;

  if (actor.role === "TEACHER") {
    return assignment.class.teacher?.userId === actor.userId;
  }

  if (actor.role === "STUDENT") {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!student) return false;
    const enr = await prisma.enrollment.findFirst({
      where: { studentId: student.id, classId: assignment.classId, status: "ACTIVE" },
      select: { id: true },
    });
    return !!enr;
  }

  return false;
}

/**
 * Can this actor see a given submission's attachments?
 *   - admins: always
 *   - the student who owns the submission
 *   - the teacher who owns the class the submission's assignment belongs to
 */
export async function canAccessSubmission(
  submissionId: string,
  actor: Actor,
): Promise<boolean> {
  if (isAdminish(actor.role)) return true;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      student: { select: { userId: true } },
      assignment: { select: { class: { select: { teacher: { select: { userId: true } } } } } },
    },
  });
  if (!submission) return false;

  if (actor.role === "STUDENT") {
    return submission.student.userId === actor.userId;
  }
  if (actor.role === "TEACHER") {
    return submission.assignment.class.teacher?.userId === actor.userId;
  }
  return false;
}

/** Human-readable size, eg "1.4 MB". Shared by both UIs (kept server-pure). */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
