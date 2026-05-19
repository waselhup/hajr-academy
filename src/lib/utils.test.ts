import { describe, it, expect } from "vitest";
import { formatSAR, calculateVAT, normalizeSaudiPhone, generateInvoiceNumber, generatePayrollNumber } from "./utils";

describe("utils", () => {
  it("formats SAR for ar", () => {
    expect(formatSAR(300, "ar")).toBe("300 ر.س");
  });
  it("formats SAR for en", () => {
    expect(formatSAR(300, "en")).toBe("SAR 300");
  });
  it("calculates VAT 15%", () => {
    expect(calculateVAT(300)).toEqual({ subtotal: 300, vat: 45, total: 345 });
  });
  it("normalizes Saudi phone with leading 05", () => {
    expect(normalizeSaudiPhone("0512345678")).toBe("+966512345678");
  });
  it("normalizes Saudi phone with +966", () => {
    expect(normalizeSaudiPhone("+966512345678")).toBe("+966512345678");
  });
  it("rejects invalid Saudi phone", () => {
    expect(normalizeSaudiPhone("123456789")).toBeNull();
  });
  it("generates invoice number with zero-padding", () => {
    expect(generateInvoiceNumber(2026, 7)).toBe("HAJR-2026-000007");
  });
  it("generates payroll number", () => {
    expect(generatePayrollNumber(2026, 5, 1)).toBe("PAY-2026-05-001");
  });
});
