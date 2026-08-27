import { describe, expect, it } from "vitest";
import { computeDelta, previousRange, rangeForDays } from "./traffic-queries";

describe("period-over-period comparison", () => {
  it("reports a rise in visits as good", () => {
    const d = computeDelta(123, 100);
    expect(d.percent).toBe(23);
    expect(d.good).toBe(true);
  });

  it("reports a fall in visits as bad", () => {
    const d = computeDelta(80, 100);
    expect(d.percent).toBe(-20);
    expect(d.good).toBe(false);
  });

  it("treats a RISING bounce rate as bad, not good", () => {
    // The trap: direction is not goodness. More people leaving immediately is
    // a worse week even though the number went up.
    const d = computeDelta(60, 40, false);
    expect(d.percent).toBe(50);
    expect(d.good).toBe(false);
  });

  it("treats a falling bounce rate as good", () => {
    const d = computeDelta(30, 40, false);
    expect(d.good).toBe(true);
  });

  it("refuses to invent a percentage when the baseline is zero", () => {
    const d = computeDelta(5, 0);
    expect(d.percent).toBeNull();
    expect(d.previous).toBe(0);
  });

  it("calls a flat period neither good nor bad", () => {
    expect(computeDelta(100, 100).good).toBeNull();
  });

  it("compares against an equally long window ending where this one began", () => {
    const r = rangeForDays(7);
    const p = previousRange(r);
    expect(p.to.getTime()).toBe(r.from.getTime());
    const span = (x: { from: Date; to: Date }) => x.to.getTime() - x.from.getTime();
    expect(span(p)).toBe(span(r));
  });
});

describe("today is never treated as a finished day", () => {
  it("flags only the current Riyadh day as partial", async () => {
    const { getDailyTrend, rangeForDays } = await import("./traffic-queries");
    const points = await getDailyTrend(rangeForDays(7));
    const partial = points.filter((p) => p.partial);
    // Exactly one in-progress day, and it must be the last one.
    expect(partial).toHaveLength(1);
    expect(points.at(-1)?.partial).toBe(true);
    expect(points.slice(0, -1).every((p) => !p.partial)).toBe(true);
  });
});
