/**
 * Combined teacher rating — pure, unit-testable formula (no DB, no React).
 *
 * Definition:
 *   Combined = mean of available {post-session avg, admin rating, self rating};
 *   missing components are excluded; null only when all are missing.
 *
 * All three inputs are on the same 1..5 scale:
 *   - postAvg     — average of approved POST_SESSION student ratings (already 1..5)
 *   - adminRating — admin-entered rating (1..5)
 *   - selfRating  — teacher self-evaluation from TeacherReadiness.selfRating (1..5)
 *
 * Result is rounded to 2 decimals (e.g. Math.round(x * 100) / 100).
 */
export function combinedTeacherAverage(parts: {
  postAvg: number | null;
  adminRating: number | null;
  selfRating: number | null;
}): number | null {
  const present = [parts.postAvg, parts.adminRating, parts.selfRating].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  if (present.length === 0) return null;
  const mean = present.reduce((sum, v) => sum + v, 0) / present.length;
  return Math.round(mean * 100) / 100;
}
