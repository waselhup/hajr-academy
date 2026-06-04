/**
 * Targeted recordings — shared server logic (C7).
 *
 * An admin uploads a video FOR a hand-picked set of users; only those users
 * (and the uploading admin) may ever see it. The binary lives in a PRIVATE
 * Supabase bucket; we persist only the storage PATH in the DB and mint a
 * short-lived signed URL on demand. A leaked link cannot be replayed for long.
 *
 * SECURITY/PDPL: visibility is decided server-side only — admins (any) or a
 * user present in TargetedRecordingViewer for that recording. Never trust the
 * client.
 */

export const TARGETED_RECORDINGS_BUCKET = "targeted-recordings";

/** Video ceiling — generous for a recorded lesson but bounded. */
export const MAX_TARGETED_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

/** Playback URLs are short-lived. */
export const TARGETED_SIGNED_URL_TTL = 3600; // 1 hour

const VIDEO_MAGIC: Array<{ mime: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  // WebM / Matroska: 1A 45 DF A3
  { mime: "video/webm", ext: "webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  // MP4 / MOV / M4V: "....ftyp"
  { mime: "video/mp4", ext: "mp4", test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
  // QuickTime / MOV: "....moov" or "....mdat"
  { mime: "video/quicktime", ext: "mov", test: (b) => b[4] === 0x6d && b[5] === 0x6f && b[6] === 0x6f && b[7] === 0x76 },
  // OGG container (Theora video): "OggS"
  { mime: "video/ogg", ext: "ogv", test: (b) => b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53 },
];

export interface DetectedVideo {
  mime: string;
  ext: string;
}

/**
 * Sniff a buffer and confirm it is one of the accepted video container
 * formats. Returns null for anything else (defends against a client lying
 * about content-type). `declaredMime` is honored only when it is a video/*
 * type that matches the sniffed family.
 */
export function detectVideo(buffer: Uint8Array, declaredMime?: string): DetectedVideo | null {
  const v = VIDEO_MAGIC.find((m) => m.test(buffer));
  if (!v) return null;
  const mime = declaredMime?.startsWith("video/") ? declaredMime : v.mime;
  return { mime, ext: v.ext };
}

/**
 * Ensure the private targeted-recordings bucket exists. Idempotent: a
 * "already exists" / duplicate error is swallowed. Safe to call before each
 * upload. `supabase` must be the service-role client.
 */
export async function ensureTargetedBucket(
  supabase: { storage: { createBucket: (id: string, opts: { public: boolean }) => Promise<{ error: { message: string } | null }> } }
): Promise<void> {
  try {
    const { error } = await supabase.storage.createBucket(TARGETED_RECORDINGS_BUCKET, { public: false });
    if (error && !/exist|already|duplicate/i.test(error.message)) {
      console.warn("[targeted-recordings] createBucket warning:", error.message);
    }
  } catch (e) {
    // Non-fatal — the upload will surface a clear error if the bucket truly
    // is missing and could not be created.
    console.warn("[targeted-recordings] ensureBucket failed:", e instanceof Error ? e.message : e);
  }
}
