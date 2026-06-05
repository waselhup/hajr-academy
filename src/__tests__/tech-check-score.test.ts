/**
 * Tech-check pass/fail thresholds — guards the region-realistic latency fix.
 *
 * The bug: a reasonable mobile/home connection (82.53↓ / 5.34↑ / 336 ms /
 * cam+mic OK) was FAILED purely because latency exceeded a 200 ms bar that real
 * Gulf networks rarely beat. These tests pin the corrected behaviour: that exact
 * reading must PASS, while a genuinely bad link must still FAIL.
 */
import { describe, it, expect } from "vitest";
import {
  evaluateTechCheck,
  TECH_CHECK_PASS,
  type TechCheckInput,
} from "@/lib/teacher/tech-check-score";

const base: TechCheckInput = {
  downloadMbps: 50,
  uploadMbps: 5,
  latencyMs: 80,
  audioPeakDb: -12,
  cameraOk: true,
  micOk: true,
};

describe("evaluateTechCheck — realistic thresholds", () => {
  it("PASSES the screenshot case (82.53↓ / 5.34↑ / 336 ms / cam+mic OK)", () => {
    const v = evaluateTechCheck({
      downloadMbps: 82.53,
      uploadMbps: 5.34,
      latencyMs: 336,
      audioPeakDb: -10,
      cameraOk: true,
      micOk: true,
    });
    expect(v.passed).toBe(true);
    expect(v.failures).toEqual([]);
    // 336 ms is in the "a bit high" band → small ding only, comfortably passing.
    expect(v.latencyHigh).toBe(true);
    expect(v.score).toBeGreaterThanOrEqual(90);
  });

  it("still FAILS a genuinely bad link (600 ms latency + 0.3 Mbps up)", () => {
    const v = evaluateTechCheck({
      ...base,
      uploadMbps: 0.3,
      latencyMs: 600,
    });
    expect(v.passed).toBe(false);
    expect(v.failures).toContain("latencyMs");
    expect(v.failures).toContain("uploadMbps");
  });

  it("treats the latency boundary inclusively (≤ 450 passes, > 450 fails)", () => {
    expect(evaluateTechCheck({ ...base, latencyMs: 450 }).passed).toBe(true);
    expect(evaluateTechCheck({ ...base, latencyMs: 451 }).failures).toContain("latencyMs");
  });

  it("fails a failed/zero latency measurement", () => {
    expect(evaluateTechCheck({ ...base, latencyMs: 0 }).failures).toContain("latencyMs");
  });

  it("passes the download floor at exactly 3 Mbps and fails below it", () => {
    expect(evaluateTechCheck({ ...base, downloadMbps: 3 }).passed).toBe(true);
    expect(evaluateTechCheck({ ...base, downloadMbps: 2.9 }).failures).toContain("downloadMbps");
  });

  it("passes the upload floor at exactly 1 Mbps and fails below it", () => {
    expect(evaluateTechCheck({ ...base, uploadMbps: 1 }).passed).toBe(true);
    expect(evaluateTechCheck({ ...base, uploadMbps: 0.9 }).failures).toContain("uploadMbps");
  });

  it("still requires camera and mic", () => {
    expect(evaluateTechCheck({ ...base, cameraOk: false }).failures).toContain("camera");
    expect(evaluateTechCheck({ ...base, micOk: false }).failures).toContain("mic");
  });

  it("a clean fast link scores 100 with no high-latency flag", () => {
    const v = evaluateTechCheck(base);
    expect(v).toMatchObject({ passed: true, score: 100, latencyHigh: false });
  });

  it("exposes the realistic thresholds it enforces", () => {
    expect(TECH_CHECK_PASS).toMatchObject({
      downloadMbps: 3,
      uploadMbps: 1,
      latencyMs: 450,
      audioPeakDb: -30,
    });
  });
});
