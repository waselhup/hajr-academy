import { describe, it, expect } from "vitest";
import {
  toAsciiDigits, sanitizeNumeric,
  dateValueToDisplay, dateDisplayToValue, maskDate,
  timeValueToDisplay, timeDisplayToValue, maskTime,
  dateTimeValueToDisplay, dateTimeDisplayToValue, maskDateTime,
} from "@/lib/western-format";

describe("toAsciiDigits", () => {
  it("maps Arabic-Indic to ASCII", () => {
    expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });
  it("maps Eastern-Arabic to ASCII", () => {
    expect(toAsciiDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });
  it("strips non-digits", () => {
    expect(toAsciiDigits("a1ب٢/3")).toBe("123");
  });
});

describe("sanitizeNumeric", () => {
  it("keeps western digits", () => expect(sanitizeNumeric("400")).toBe("400"));
  it("converts arabic-indic 60", () => expect(sanitizeNumeric("٦٠")).toBe("60"));
  it("converts arabic-indic 400", () => expect(sanitizeNumeric("٤٠٠")).toBe("400"));
  it("preserves a single decimal", () => expect(sanitizeNumeric("0.10")).toBe("0.10"));
  it("normalizes arabic decimal separator", () => expect(sanitizeNumeric("0٫5")).toBe("0.5"));
  it("keeps a leading minus", () => expect(sanitizeNumeric("-12")).toBe("-12"));
  it("drops extra dots", () => expect(sanitizeNumeric("1.2.3")).toBe("1.23"));
});

describe("date field (canonical yyyy-mm-dd <-> dd/mm/yyyy)", () => {
  it("value -> display", () => expect(dateValueToDisplay("2026-06-04")).toBe("04/06/2026"));
  it("empty value -> empty", () => expect(dateValueToDisplay("")).toBe(""));
  it("display -> value", () => expect(dateDisplayToValue("04/06/2026")).toBe("2026-06-04"));
  it("display from arabic digits -> western value", () => expect(dateDisplayToValue("٠٤/٠٦/٢٠٢٦")).toBe("2026-06-04"));
  it("incomplete -> empty", () => expect(dateDisplayToValue("04/06")).toBe(""));
  it("invalid month -> empty", () => expect(dateDisplayToValue("04/13/2026")).toBe(""));
  it("masks progressively", () => {
    expect(maskDate("0")).toBe("0");
    expect(maskDate("04")).toBe("04");
    expect(maskDate("0406")).toBe("04/06");
    expect(maskDate("04062026")).toBe("04/06/2026");
    expect(maskDate("٠٤٠٦٢٠٢٦")).toBe("04/06/2026");
  });
  it("round-trips", () => expect(dateDisplayToValue(dateValueToDisplay("2026-12-31"))).toBe("2026-12-31"));
});

describe("time field (canonical HH:mm)", () => {
  it("value -> display", () => expect(timeValueToDisplay("06:00")).toBe("06:00"));
  it("display -> value", () => expect(timeDisplayToValue("06:00")).toBe("06:00"));
  it("arabic digits -> western", () => expect(timeDisplayToValue("٠٦٠٠")).toBe("06:00"));
  it("invalid hour -> empty", () => expect(timeDisplayToValue("25:00")).toBe(""));
  it("masks", () => { expect(maskTime("06")).toBe("06"); expect(maskTime("0600")).toBe("06:00"); });
});

describe("datetime field (canonical yyyy-mm-ddTHH:mm)", () => {
  it("value -> display", () => expect(dateTimeValueToDisplay("2026-06-04T18:30")).toBe("04/06/2026 18:30"));
  it("display -> value", () => expect(dateTimeDisplayToValue("04/06/2026 18:30")).toBe("2026-06-04T18:30"));
  it("arabic digits -> western", () => expect(dateTimeDisplayToValue("٠٤/٠٦/٢٠٢٦ ١٨:٣٠")).toBe("2026-06-04T18:30"));
  it("incomplete -> empty", () => expect(dateTimeDisplayToValue("04/06/2026")).toBe(""));
  it("round-trips", () => expect(dateTimeDisplayToValue(dateTimeValueToDisplay("2026-01-09T09:05"))).toBe("2026-01-09T09:05"));
});
