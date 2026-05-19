import { describe, it, expect } from "vitest";
import { calcInvoiceTotals, buildInvoiceNumber, isGenderAllowed } from "@/lib/invoice";
import { generateCohortCode, nextCohortLetter, quarterOf } from "@/lib/cohort";
import { generateInviteCode } from "@/lib/invite-code";
import { fmtSAR, teacherColor } from "@/lib/format";
import { normalizeSaudiPhone, generateInvoiceNumber, generatePayrollNumber, calculateVAT } from "@/lib/utils";

describe("invoice math", () => {
  it("calculates VAT at 15%", () => {
    expect(calcInvoiceTotals(250)).toEqual({ subtotal: 250, vat: 37.5, total: 287.5 });
  });
  it("handles zero", () => {
    expect(calcInvoiceTotals(0)).toEqual({ subtotal: 0, vat: 0, total: 0 });
  });
  it("rounds correctly", () => {
    const r = calcInvoiceTotals(100.33);
    expect(r.subtotal).toBe(100.33);
    expect(r.vat).toBe(15.05);
    expect(r.total).toBe(115.38);
  });
  it("builds invoice number with zero-padding", () => {
    expect(buildInvoiceNumber(2026, 7)).toBe("HAJR-2026-000007");
    expect(buildInvoiceNumber(2026, 123456)).toBe("HAJR-2026-123456");
  });
});

describe("gender enrollment guard", () => {
  it("allows when no restriction", () => {
    expect(isGenderAllowed("MALE", null)).toBe(true);
    expect(isGenderAllowed("FEMALE", null)).toBe(true);
  });
  it("blocks female in male-only class", () => {
    expect(isGenderAllowed("FEMALE", "MALE")).toBe(false);
  });
  it("blocks male in female-only class", () => {
    expect(isGenderAllowed("MALE", "FEMALE")).toBe(false);
  });
  it("allows matching gender", () => {
    expect(isGenderAllowed("MALE", "MALE")).toBe(true);
    expect(isGenderAllowed("FEMALE", "FEMALE")).toBe(true);
  });
});

describe("cohort code generator", () => {
  it("computes quarter correctly", () => {
    expect(quarterOf(1)).toBe(1);
    expect(quarterOf(3)).toBe(1);
    expect(quarterOf(4)).toBe(2);
    expect(quarterOf(6)).toBe(2);
    expect(quarterOf(7)).toBe(3);
    expect(quarterOf(12)).toBe(4);
  });
  it("generates expected codes", () => {
    expect(generateCohortCode({ programCode: "STEP_PREP", year: 2026, quarter: 2, letter: "A" })).toBe("STEP-2026-Q2-A");
    expect(generateCohortCode({ programCode: "UNI_PREP", year: 2026, quarter: 4, letter: "B" })).toBe("UNI-2026-Q4-B");
    expect(generateCohortCode({ programCode: "ENGLISH_LAB", year: 2026, quarter: 1, letter: "C" })).toBe("LAB-2026-Q1-C");
  });
  it("picks next letter avoiding collisions", () => {
    expect(nextCohortLetter([])).toBe("A");
    expect(nextCohortLetter(["A"])).toBe("B");
    expect(nextCohortLetter(["A", "C"])).toBe("B");
    expect(nextCohortLetter(["A", "B", "C", "D", "E"])).toBe("F");
  });
});

describe("Saudi phone normalization", () => {
  it("accepts +966 prefix", () => {
    expect(normalizeSaudiPhone("+966512345678")).toBe("+966512345678");
  });
  it("accepts 0 prefix", () => {
    expect(normalizeSaudiPhone("0512345678")).toBe("+966512345678");
  });
  it("accepts bare 5XXXXXXXX", () => {
    expect(normalizeSaudiPhone("512345678")).toBe("+966512345678");
  });
  it("strips spaces and dashes", () => {
    expect(normalizeSaudiPhone("+966 51 234-5678")).toBe("+966512345678");
  });
  it("rejects non-Saudi", () => {
    expect(normalizeSaudiPhone("123456789")).toBeNull();
    expect(normalizeSaudiPhone("+1234567890")).toBeNull();
  });
});

describe("SAR formatter", () => {
  it("formats AR locale", () => {
    expect(fmtSAR(300, "ar")).toBe("300 ر.س");
  });
  it("formats EN locale", () => {
    expect(fmtSAR(300, "en")).toBe("SAR 300");
  });
  it("handles thousands", () => {
    expect(fmtSAR(15000, "en")).toBe("SAR 15,000");
  });
  it("handles strings", () => {
    expect(fmtSAR("400.00", "ar")).toBe("400 ر.س");
  });
});

describe("teacher color hash", () => {
  it("is deterministic", () => {
    expect(teacherColor("teacher-1")).toBe(teacherColor("teacher-1"));
  });
  it("varies across IDs", () => {
    const colors = new Set(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id) => teacherColor(id)));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe("invite code generator", () => {
  it("creates 8-char by default", () => {
    expect(generateInviteCode().length).toBe(8);
  });
  it("avoids ambiguous chars", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode(8);
      expect(code).not.toMatch(/[0O1I]/);
    }
  });
  it("respects length param", () => {
    expect(generateInviteCode(12).length).toBe(12);
  });
});

describe("utility functions", () => {
  it("generates invoice number via helper", () => {
    expect(generateInvoiceNumber(2026, 1)).toBe("HAJR-2026-000001");
  });
  it("generates payroll number", () => {
    expect(generatePayrollNumber(2026, 5, 1)).toBe("PAY-2026-05-001");
  });
  it("calculateVAT alias works", () => {
    expect(calculateVAT(250)).toEqual({ subtotal: 250, vat: 37.5, total: 287.5 });
  });
});

describe("audit log helper (shape)", () => {
  it("module is importable", async () => {
    const mod = await import("@/lib/audit");
    expect(typeof mod.logAudit).toBe("function");
  });
});

describe("Hijri formatter", () => {
  it("returns a string (may be empty if moment-hijri unavailable)", async () => {
    const { fmtHijri } = await import("@/lib/format");
    expect(typeof fmtHijri(new Date())).toBe("string");
  });
});
