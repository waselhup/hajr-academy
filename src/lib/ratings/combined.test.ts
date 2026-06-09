/**
 * Unit tests for combinedTeacherAverage — the explicit combined-rating formula
 * surfaced on the admin ratings table. Covers: all three present, partial
 * (some null), all null, and 2-decimal rounding.
 */
import { describe, it, expect } from "vitest";
import { combinedTeacherAverage } from "./combined";

describe("combinedTeacherAverage", () => {
  it("averages all three components when present", () => {
    // (4 + 5 + 3) / 3 = 4
    expect(
      combinedTeacherAverage({ postAvg: 4, adminRating: 5, selfRating: 3 })
    ).toBe(4);
  });

  it("ignores null components and averages the rest", () => {
    // (4 + 2) / 2 = 3
    expect(
      combinedTeacherAverage({ postAvg: 4, adminRating: null, selfRating: 2 })
    ).toBe(3);
    // single present component returns itself
    expect(
      combinedTeacherAverage({ postAvg: null, adminRating: 5, selfRating: null })
    ).toBe(5);
  });

  it("returns null when all components are missing", () => {
    expect(
      combinedTeacherAverage({ postAvg: null, adminRating: null, selfRating: null })
    ).toBeNull();
  });

  it("rounds to 2 decimals", () => {
    // (4.5 + 5 + 3) / 3 = 4.1666… → 4.17
    expect(
      combinedTeacherAverage({ postAvg: 4.5, adminRating: 5, selfRating: 3 })
    ).toBe(4.17);
    // (4 + 5) / 2 = 4.5 (exact, no spurious decimals)
    expect(
      combinedTeacherAverage({ postAvg: 4, adminRating: 5, selfRating: null })
    ).toBe(4.5);
  });
});
