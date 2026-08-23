import { describe, it, expect } from "vitest";
import { z } from "zod";
import { GRADE_OPTIONS, GRADE_VALUES, gradeLabel } from "@/lib/grades";
import { whatsappLink, purchaseWhatsappMessage, WHATSAPP_NUMBER } from "@/lib/whatsapp";

describe("grade options", () => {
  it("covers grades 1–12 plus university/adult", () => {
    expect(GRADE_VALUES).toHaveLength(14);
    for (let g = 1; g <= 12; g++) {
      expect(GRADE_VALUES).toContain(String(g));
    }
    expect(GRADE_VALUES).toContain("UNIVERSITY");
    expect(GRADE_VALUES).toContain("ADULT");
  });

  it("keeps school grades numeric so age-tier parsing keeps working", () => {
    const numeric = GRADE_OPTIONS.filter((g) => !isNaN(parseInt(g.value, 10)));
    expect(numeric).toHaveLength(12);
  });

  it("labels a grade in both languages and falls back to the raw value", () => {
    expect(gradeLabel("7", false)).toBe("Grade 7");
    expect(gradeLabel("7", true)).toBe("الأول المتوسط");
    expect(gradeLabel("UNKNOWN", false)).toBe("UNKNOWN");
    expect(gradeLabel(null, false)).toBeNull();
  });
});

describe("checkout grade is mandatory", () => {
  // Mirrors the server-side rule in /api/checkout: no grade → no payment.
  const schema = z.object({ gradeLevel: z.enum(GRADE_VALUES) });

  it("rejects a missing or empty grade", () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ gradeLevel: "" }).success).toBe(false);
  });

  it("rejects a grade outside the offered list", () => {
    expect(schema.safeParse({ gradeLevel: "13" }).success).toBe(false);
  });

  it("accepts an offered grade", () => {
    expect(schema.safeParse({ gradeLevel: "10" }).success).toBe(true);
  });
});

describe("post-payment WhatsApp hand-off", () => {
  it("builds a wa.me deep link with an encoded message", () => {
    const href = whatsappLink("hello there");
    expect(href).toBe(`https://wa.me/${WHATSAPP_NUMBER}?text=hello%20there`);
    expect(WHATSAPP_NUMBER).toMatch(/^\d+$/);
  });

  it("defaults to the academy line (0502456651)", () => {
    expect(WHATSAPP_NUMBER).toBe("966502456651");
  });

  it("includes the package, student, grade and reference in Arabic", () => {
    const msg = purchaseWhatsappMessage({
      isAr: true,
      studentName: "سارة",
      packageName: "الباقة المتكاملة",
      gradeLabel: "الأول المتوسط",
      amountSar: "300.00",
      reference: "order-123",
    });
    expect(msg).toContain("اشتريت للتو");
    expect(msg).toContain("الباقة المتكاملة");
    expect(msg).toContain("سارة");
    expect(msg).toContain("الأول المتوسط");
    expect(msg).toContain("order-123");
  });

  it("stays sensible in English when details are missing", () => {
    const msg = purchaseWhatsappMessage({ isAr: false });
    expect(msg).toContain("I just bought a package");
    expect(msg).not.toContain("undefined");
    expect(msg).not.toContain("null");
  });
});
