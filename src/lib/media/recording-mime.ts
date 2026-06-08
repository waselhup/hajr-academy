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
const OGG_MAGIC = [0x4f, 0x67, 0x67, 0x53]; // "OggS" at byte 0 (Ogg)

/**
 * ISO-BMFF (MP4-family) "brand" boxes whose presence near the head of the file
 * identifies an MP4/M4A/fragmented-MP4 container:
 *  - ftyp: the standard file-type box (plain MP4, leads at offset 4)
 *  - styp: segment-type box (fragmented MP4 / iOS audio segments)
 *  - moov: movie box (sometimes leads when no ftyp is emitted)
 */
const ISO_BMFF_BRANDS = new Set(["ftyp", "styp", "moov"]);
/** Boxes we skip over while still scanning forward for a brand box. */
const ISO_BMFF_SKIPPABLE = new Set(["moof", "mdat", "free", "skip", "wide", "sidx"]);

function readBoxType(buf: Uint8Array, pos: number): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    const c = buf[pos + i];
    if (c === undefined) return "";
    s += String.fromCharCode(c);
  }
  return s;
}

export function isWebmContainer(buf: Uint8Array): boolean {
  return WEBM_MAGIC.every((b, i) => buf[i] === b);
}

/**
 * Tolerant MP4-family detection. Walks the first few top-level ISO-BMFF boxes —
 * each box is a 4-byte big-endian size followed by a 4-char type at offset+4 —
 * and returns true if it finds an ftyp/styp/moov brand box. This recognises
 * iOS Safari's fragmented-MP4 audio (which can lead with styp/moof or place the
 * brand box off the fixed byte-4 offset) while still rejecting random bytes.
 *
 * The common case — a plain MP4 with "ftyp" at bytes 4-7 — is still matched on
 * the very first box, so existing exact-offset behaviour is preserved.
 */
export function isFtypContainer(buf: Uint8Array): boolean {
  let pos = 0;
  // Walk up to ~5 boxes or the first ~1KB, whichever comes first.
  for (let box = 0; box < 5 && pos + 8 <= buf.length && pos < 1024; box++) {
    const type = readBoxType(buf, pos + 4);
    if (ISO_BMFF_BRANDS.has(type)) return true;

    // 32-bit big-endian box size covering the header + payload.
    const size =
      ((buf[pos] << 24) | (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3]) >>> 0;

    // Only advance past boxes we recognise as skippable; an unknown leading box
    // with a bogus size shouldn't let us walk into arbitrary bytes and guess.
    if (!ISO_BMFF_SKIPPABLE.has(type)) return false;
    // size 0 = "to end of file", size 1 = 64-bit extended size: can't safely
    // step over either with a 32-bit read, so stop scanning.
    if (size < 8) return false;
    pos += size;
  }
  return false;
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
