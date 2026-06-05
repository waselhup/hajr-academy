/**
 * Tech-check pass/fail + score — the single source of truth, kept as a pure
 * function so both the save route AND a unit test exercise the exact same logic.
 *
 * Thresholds are REGION-REALISTIC: real home/mobile links in the Gulf rarely
 * beat 200 ms RTT, so the bar is what a Zoom class genuinely needs, not a
 * fibre-grade ideal. A reasonable connection (e.g. 80↓ / 5↑ / 336 ms / cam+mic
 * OK) PASSES; a genuinely bad link (e.g. 0.3↑ / 600 ms) still FAILS.
 *
 * NOTE: the same numbers are mirrored (display-only) in the wizard's PASS block
 * (tech-check-wizard.tsx) — keep them in sync.
 */

export const TECH_CHECK_PASS = {
  downloadMbps: 3,
  uploadMbps: 1,
  latencyMs: 450,
  audioPeakDb: -30,
} as const;

/** Latency at/under this is "clean"; above it (but ≤ pass) is "OK, a bit high". */
export const LATENCY_OK_BUT_HIGH_MS = 250;

export interface TechCheckInput {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  audioPeakDb: number;
  cameraOk: boolean;
  micOk: boolean;
}

export interface TechCheckVerdict {
  passed: boolean;
  score: number;
  failures: string[];
  /** True when latency passed but sits in the gentle "a bit high" band. */
  latencyHigh: boolean;
}

/**
 * Decide pass/fail + a 0-100 score from a tech-check reading. Pure + total:
 * never throws, clamps the score, and treats a non-positive latency (a failed
 * measurement) as a failure.
 */
export function evaluateTechCheck(input: TechCheckInput): TechCheckVerdict {
  const downloadMbps = Number(input.downloadMbps ?? 0);
  const uploadMbps = Number(input.uploadMbps ?? 0);
  const latencyMs = Math.round(Number(input.latencyMs ?? 0));
  const audioPeakDb = Number(input.audioPeakDb ?? -100);
  const cameraOk = !!input.cameraOk;
  const micOk = !!input.micOk;

  const latencyBad = latencyMs > TECH_CHECK_PASS.latencyMs || latencyMs <= 0;
  const latencyHigh = !latencyBad && latencyMs > LATENCY_OK_BUT_HIGH_MS;

  const failures: string[] = [];
  if (downloadMbps < TECH_CHECK_PASS.downloadMbps) failures.push("downloadMbps");
  if (uploadMbps < TECH_CHECK_PASS.uploadMbps) failures.push("uploadMbps");
  if (latencyBad) failures.push("latencyMs");
  if (audioPeakDb <= TECH_CHECK_PASS.audioPeakDb) failures.push("audioPeakDb");
  if (!cameraOk) failures.push("camera");
  if (!micOk) failures.push("mic");

  // Score: 100 minus penalties. A passing-but-"a bit high" latency (250–450 ms,
  // normal on home/mobile networks) takes only a small ding, never a fail.
  let score = 100;
  if (downloadMbps < TECH_CHECK_PASS.downloadMbps) score -= 25;
  else if (downloadMbps < 5) score -= 8;
  if (uploadMbps < TECH_CHECK_PASS.uploadMbps) score -= 15;
  if (latencyBad) score -= 25;
  else if (latencyHigh) score -= 8;
  if (audioPeakDb <= TECH_CHECK_PASS.audioPeakDb) score -= 15;
  if (!cameraOk) score -= 10;
  if (!micOk) score -= 10;
  score = Math.max(0, Math.min(100, score));

  return { passed: failures.length === 0, score, failures, latencyHigh };
}
