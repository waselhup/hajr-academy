/**
 * Chat recording container negotiation + magic-byte detection.
 *
 * The bug this guards: the chat "Record video" produced a blob the recorder
 * hardcoded as video/webm, but Safari/iOS actually record video/mp4. The upload
 * route only knew the WebM EBML header, so valid MP4 takes were rejected as
 * "Unsupported file type". These tests pin the corrected behaviour — webm AND
 * mp4 (and ogg audio) are detected via container bytes + the AUDIO|VIDEO hint,
 * disambiguated correctly, and mapped to the right extension. Voice (audio) must
 * keep working unchanged.
 */
import { describe, it, expect } from "vitest";
import {
  detectRecordedMedia,
  extForMime,
  baseContainerMime,
  mimeCandidates,
  isWebmContainer,
  isFtypContainer,
  isOggContainer,
  RECORDED_MEDIA_MIMES,
} from "@/lib/media/recording-mime";

/** Build a fake buffer with a given header followed by padding. */
function buf(header: number[], offset = 0): Uint8Array {
  const b = new Uint8Array(32);
  header.forEach((v, i) => (b[i + offset] = v));
  return b;
}

const WEBM = buf([0x1a, 0x45, 0xdf, 0xa3]);
const FTYP = buf([0x66, 0x74, 0x79, 0x70], 4); // "ftyp" at bytes 4-7
const OGG = buf([0x4f, 0x67, 0x67, 0x53]);

describe("container signature detectors", () => {
  it("recognises a WebM EBML header", () => {
    expect(isWebmContainer(WEBM)).toBe(true);
    expect(isFtypContainer(WEBM)).toBe(false);
    expect(isOggContainer(WEBM)).toBe(false);
  });
  it("recognises an MP4 ftyp box at bytes 4-7", () => {
    expect(isFtypContainer(FTYP)).toBe(true);
    expect(isWebmContainer(FTYP)).toBe(false);
  });
  it("recognises an Ogg header", () => {
    expect(isOggContainer(OGG)).toBe(true);
  });
  it("rejects random bytes", () => {
    const junk = buf([0x00, 0x11, 0x22, 0x33]);
    expect(isWebmContainer(junk)).toBe(false);
    expect(isFtypContainer(junk)).toBe(false);
    expect(isOggContainer(junk)).toBe(false);
  });
});

describe("detectRecordedMedia — header + AUDIO|VIDEO hint", () => {
  it("WebM + VIDEO hint → video/webm (Chrome/Firefox video take)", () => {
    expect(detectRecordedMedia(WEBM, "VIDEO")).toBe("video/webm");
  });
  it("WebM + AUDIO hint → audio/webm (voice — must still work)", () => {
    expect(detectRecordedMedia(WEBM, "AUDIO")).toBe("audio/webm");
  });
  it("MP4 ftyp + VIDEO hint → video/mp4 (Safari/iOS video take — the fix)", () => {
    expect(detectRecordedMedia(FTYP, "VIDEO")).toBe("video/mp4");
  });
  it("MP4 ftyp + AUDIO hint → audio/mp4 (Safari voice take)", () => {
    expect(detectRecordedMedia(FTYP, "AUDIO")).toBe("audio/mp4");
  });
  it("Ogg + AUDIO hint → audio/ogg", () => {
    expect(detectRecordedMedia(OGG, "AUDIO")).toBe("audio/ogg");
  });
  it("returns null for unrecognised bytes (rejected upstream)", () => {
    expect(detectRecordedMedia(buf([1, 2, 3, 4]), "VIDEO")).toBeNull();
  });
  it("every detected mime is in the accepted-media allow-list", () => {
    for (const [b, k] of [
      [WEBM, "VIDEO"],
      [WEBM, "AUDIO"],
      [FTYP, "VIDEO"],
      [FTYP, "AUDIO"],
      [OGG, "AUDIO"],
    ] as const) {
      const m = detectRecordedMedia(b, k);
      expect(m).not.toBeNull();
      expect(RECORDED_MEDIA_MIMES.has(m as string)).toBe(true);
    }
  });
});

describe("extForMime", () => {
  it("maps each accepted mime to a sane extension", () => {
    expect(extForMime("video/webm")).toBe("webm");
    expect(extForMime("audio/webm")).toBe("webm");
    expect(extForMime("video/mp4")).toBe("mp4");
    expect(extForMime("audio/mp4")).toBe("m4a");
    expect(extForMime("audio/ogg")).toBe("ogg");
  });
  it("falls back to webm for anything unknown", () => {
    expect(extForMime("video/x-matroska")).toBe("webm");
  });
});

describe("baseContainerMime — strips codec params", () => {
  it("drops the ;codecs=… suffix the recorder reports", () => {
    expect(baseContainerMime("video/webm;codecs=vp9,opus", "video")).toBe("video/webm");
    expect(baseContainerMime("audio/webm;codecs=opus", "voice")).toBe("audio/webm");
    expect(baseContainerMime("video/mp4", "video")).toBe("video/mp4");
  });
  it("falls back to the mode's webm when the browser reports nothing", () => {
    expect(baseContainerMime("", "video")).toBe("video/webm");
    expect(baseContainerMime("", "voice")).toBe("audio/webm");
  });
});

describe("mimeCandidates — negotiation order", () => {
  it("prefers WebM then MP4 for video", () => {
    const c = mimeCandidates("video");
    expect(c[0]).toContain("video/webm");
    expect(c).toContain("video/mp4");
    // WebM ranks before MP4 (smaller, Chrome/Firefox default).
    expect(c.findIndex((x) => x.startsWith("video/webm"))).toBeLessThan(
      c.indexOf("video/mp4"),
    );
  });
  it("offers webm/mp4/ogg fallbacks for audio", () => {
    const c = mimeCandidates("voice");
    expect(c.some((x) => x.startsWith("audio/webm"))).toBe(true);
    expect(c).toContain("audio/mp4");
    expect(c).toContain("audio/ogg");
  });
});
