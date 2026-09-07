/**
 * Preferred class hours: several values in one string column.
 *
 * The risk being pinned here is silent data loss. Orders placed before
 * multi-select existed hold a single two-hour block, and if the parser or the
 * label renderer stopped understanding those, past orders would quietly start
 * displaying a dash — the academy would lose the time the customer actually
 * chose, with nothing to show it had happened.
 */
import { describe, it, expect } from "vitest";
import {
  TIME_VALUES,
  TIME_WINDOWS,
  parseTimes,
  serializeTimes,
  timeLabel,
} from "./checkout-options";

describe("teaching hours", () => {
  it("offers every hour from 3 PM to 9 PM, one hour each", () => {
    expect(TIME_WINDOWS).toHaveLength(6);
    expect(TIME_VALUES).toEqual([
      "15:00-16:00",
      "16:00-17:00",
      "17:00-18:00",
      "18:00-19:00",
      "19:00-20:00",
      "20:00-21:00",
    ]);
    // Every window is exactly one hour — the whole point of the change.
    for (const w of TIME_WINDOWS) {
      const [from, to] = w.value.split("-").map((t) => Number(t.split(":")[0]));
      expect(to - from).toBe(1);
    }
  });
});

describe("serializeTimes", () => {
  it("stores the hours in clock order, not click order", () => {
    expect(serializeTimes(["19:00-20:00", "15:00-16:00"])).toBe(
      "15:00-16:00,19:00-20:00"
    );
  });

  it("drops duplicates", () => {
    expect(serializeTimes(["16:00-17:00", "16:00-17:00"])).toBe("16:00-17:00");
  });

  it("round-trips through parseTimes", () => {
    const picked = ["20:00-21:00", "16:00-17:00", "17:00-18:00"];
    expect(parseTimes(serializeTimes(picked))).toEqual([
      "16:00-17:00",
      "17:00-18:00",
      "20:00-21:00",
    ]);
  });
});

describe("parseTimes", () => {
  it("reads a legacy single value as a list of one", () => {
    expect(parseTimes("18:00-20:00")).toEqual(["18:00-20:00"]);
  });

  it("is empty for null, undefined and empty string", () => {
    expect(parseTimes(null)).toEqual([]);
    expect(parseTimes(undefined)).toEqual([]);
    expect(parseTimes("")).toEqual([]);
  });

  it("tolerates stray spaces around the separator", () => {
    expect(parseTimes("15:00-16:00 , 18:00-19:00")).toEqual([
      "15:00-16:00",
      "18:00-19:00",
    ]);
  });
});

describe("timeLabel", () => {
  it("renders several hours together", () => {
    const out = timeLabel("15:00-16:00,18:00-19:00", true);
    expect(out).toContain("3:00 – 4:00");
    expect(out).toContain("6:00 – 7:00");
  });

  it("still renders the retired two-hour blocks from old orders", () => {
    expect(timeLabel("18:00-20:00", false)).toBe("6:00 – 8:00 PM");
    expect(timeLabel("15:00-17:00", true)).toBe("3:00 – 5:00 مساءً");
  });

  it("shows an unknown value verbatim rather than hiding it", () => {
    // The assistant stores free text here; a dash would lose what was said.
    expect(timeLabel("after maghrib", false)).toBe("after maghrib");
  });

  it("is a dash only when there is genuinely nothing", () => {
    expect(timeLabel(null, true)).toBe("—");
  });

  it("uses Western digits in Arabic, per the platform rule", () => {
    expect(timeLabel("19:00-20:00", true)).not.toMatch(/[٠-٩]/);
  });
});
