/**
 * Public feedback-survey media — shared server logic.
 *
 * The survey at /survey is PUBLIC (no auth). A respondent may optionally
 * record a short VOICE or VIDEO testimonial, or upload an audio/video file.
 * Those land in the PRIVATE `survey-media` bucket; we persist only the storage
 * PATH on FeedbackSurveyResponse and an ADMIN-only endpoint signs it on demand
 * (so a leaked link can't be replayed and the public never gets a raw URL).
 *
 * Validation (magic bytes, size ceiling) reuses the exact, battle-tested
 * primitives from the assignment-attachment system — we only narrow the
 * accepted kinds to AUDIO/VIDEO and tighten the duration caps to the survey's
 * "keep it short" guidance. Nothing here trusts the client's declared mime.
 *
 * SECURITY/PDPL: survey media must NEVER be world-readable. Access is decided
 * server-side only, gated to admins, in the /api/admin/feedback/media route.
 */
import {
  detectAttachment,
  MAX_MEDIA_BYTES,
} from "@/lib/assignments/attachments";
import type { DetectedFile } from "@/lib/assignments/attachments";

/** Private Supabase bucket dedicated to survey testimonial media. */
export const SURVEY_BUCKET = "survey-media";

/**
 * Survey duration caps (shorter than the assignment caps by design — the
 * on-page guidance asks for a 30–60s message). Re-checked server-side; the
 * recorder also auto-stops the client at these limits.
 */
export const SURVEY_MAX_VOICE_SEC = 2 * 60; // ≤ 2 minutes
export const SURVEY_MAX_VIDEO_SEC = 90; // ≤ 90 seconds

/** Survey media is recorded media only — never documents. */
export const SURVEY_MEDIA_BYTES = MAX_MEDIA_BYTES; // 50 MB ceiling (shared)

/**
 * Validate an uploaded survey blob: sniff magic bytes, require it to be AUDIO
 * or VIDEO (a document/image is rejected), enforce the size ceiling, and
 * normalise the recorded duration against the survey cap.
 *
 * Returns the detected file + the clamped duration, or an `{ error }` with the
 * HTTP status the route should return. Pure — no IO, so it stays trivially
 * testable and identical to the assignment path's guarantees.
 */
export function validateSurveyMedia(
  buffer: Uint8Array,
  declaredKind: "AUDIO" | "VIDEO" | null,
  declaredMime: string | undefined,
  sizeBytes: number,
  durationRaw: string | null,
):
  | { ok: true; detected: DetectedFile; durationSec: number | null }
  | { ok: false; status: number; error: string } {
  const detected = detectAttachment(buffer, declaredKind, declaredMime);
  // Only recorded media is allowed in the survey bucket.
  if (!detected || (detected.kind !== "AUDIO" && detected.kind !== "VIDEO")) {
    return { ok: false, status: 415, error: "Unsupported file type" };
  }

  if (sizeBytes > SURVEY_MEDIA_BYTES) {
    return {
      ok: false,
      status: 413,
      error: `File too large (max ${Math.round(SURVEY_MEDIA_BYTES / 1024 / 1024)}MB)`,
    };
  }

  let durationSec: number | null = null;
  if (durationRaw != null && durationRaw !== "") {
    const d = Math.round(Number(durationRaw));
    if (Number.isFinite(d) && d >= 0) durationSec = d;
  }
  if (durationSec != null) {
    const cap =
      detected.kind === "VIDEO" ? SURVEY_MAX_VIDEO_SEC : SURVEY_MAX_VOICE_SEC;
    if (durationSec > cap + 2 /* small tolerance for encoder slop */) {
      return { ok: false, status: 413, error: "Recording exceeds the allowed length" };
    }
  }

  return { ok: true, detected, durationSec };
}
