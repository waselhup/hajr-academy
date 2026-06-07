/**
 * Pure helpers for in-browser recording container negotiation + server-side
 * magic-byte detection. Extracted so they can be unit-tested without a DOM or a
 * live MediaRecorder (the chat voice/video recorder + /api/messages/upload both
 * rely on this logic).
 *
 * Why this exists: not every browser records WebM. Chrome/Firefox emit
 * video/webm; Safari (desktop + iOS) only records video/mp4. The recorder must
 * report the REAL container it produced and the upload route must accept +
 * validate it, otherwise valid Safari takes are rejected as "Unsupported file
 * type".
 */

/** Magic-byte signatures keyed by the bare container mime. */
const WEBM_MAGIC = [0x1a, 0x45, 0xdf, 0xa3]; // EBML header (WebM / Matroska)
const FTYP = [0x66, 0x74, 0x79, 0x70]; // "ftyp" box at bytes 4-7 (MP4 / M4A)
const OGG_MAGIC = [0x4f, 0x67, 0x67, 0x53]; // "OggS" at byte 0 (Ogg)

export function isWebmContainer(buf: Uint8Array): boolean {
  return WEBM_MAGIC.every((b, i) => buf[i] === b);
}
export function isFtypContainer(buf: Uint8Array): boolean {
  return FTYP.every((b, i) => buf[i + 4] === b);
}
export function isOggContainer(buf: Uint8Array): boolean {
  return OGG_MAGIC.every((b, i) => buf[i] === b);
}

export type RecordingKind = "AUDIO" | "VIDEO";

/**
 * Resolve a recorded blob to a concrete mime from its bytes + the recorder's
 * AUDIO|VIDEO hint (webm/mp4 share ambiguous headers). null = not a recognised
 * recording container.
 */
export function detectRecordedMedia(buf: Uint8Array, kind: RecordingKind): string | null {
  if (isWebmContainer(buf)) return kind === "VIDEO" ? "video/webm" : "audio/webm";
  if (isFtypContainer(buf)) return kind === "VIDEO" ? "video/mp4" : "audio/mp4";
  if (isOggContainer(buf)) return kind === "AUDIO" ? "audio/ogg" : null;
  return null;
}

/** Recorded-media mimes the chat upload route accepts (magic-byte validated). */
export const RECORDED_MEDIA_MIMES = new Set([
  "audio/webm",
  "video/webm",
  "video/mp4",
  "audio/mp4",
  "audio/ogg",
]);

/** File extension for a recorded-media mime (used for the storage object key). */
export function extForMime(mime: string): string {
  switch (mime) {
    case "video/webm":
    case "audio/webm":
      return "webm";
    case "video/mp4":
      return "mp4";
    case "audio/mp4":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    default:
      return "webm";
  }
}

/**
 * Strip codec params from a MediaRecorder mimeType → the bare container mime the
 * upload route validates. Falls back to the mode's WebM default when the browser
 * reports an empty/unknown type.
 */
export function baseContainerMime(full: string, mode: "voice" | "video"): string {
  const bare = (full.split(";")[0] || "").trim().toLowerCase();
  if (bare.startsWith("video/") || bare.startsWith("audio/")) return bare;
  return mode === "video" ? "video/webm" : "audio/webm";
}

/**
 * Ordered MediaRecorder container candidates for a capture mode. WebM first
 * (Chrome/Firefox, smaller), then MP4 (Safari/iOS), then bare types. The caller
 * picks the first the runtime's MediaRecorder.isTypeSupported() accepts.
 */
export function mimeCandidates(mode: "voice" | "video"): string[] {
  return mode === "video"
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
}
