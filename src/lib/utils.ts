import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSAR(amount: number | string, locale: "ar" | "en" = "ar"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return locale === "ar"
    ? `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س`
    : `SAR ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function calculateVAT(subtotal: number, rate = 0.15) {
  const vat = +(subtotal * rate).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);
  return { subtotal, vat, total };
}

export function normalizeSaudiPhone(input: string): string | null {
  const cleaned = input.replace(/\s|-/g, "");
  const re = /^(\+966|0)?5[0-9]{8}$/;
  if (!re.test(cleaned)) return null;
  const digits = cleaned.replace(/^(\+966|0)/, "");
  return `+966${digits}`;
}

/**
 * Normalise ANY country's mobile number to E.164 (`+<digits>`).
 *
 * Used where the person is not necessarily in Saudi Arabia — teaching
 * applications arrive from Armenia, Egypt, the Philippines. Requiring a
 * Saudi number there rejects exactly the applicants the academy wants.
 *
 * A Saudi-looking local number (05… / 5…) still resolves to +966 so those
 * applicants are stored the same way as everyone else in the system.
 */
export function normalizeInternationalPhone(input: string): string | null {
  const cleaned = (input ?? "").replace(/[\s\-().]/g, "");
  if (!cleaned) return null;

  // Saudi shorthand keeps its long-standing meaning.
  if (/^(0?5[0-9]{8})$/.test(cleaned)) {
    return `+966${cleaned.replace(/^0/, "")}`;
  }
  // 00 is the international prefix in most of the world.
  const withPlus = cleaned.replace(/^00/, "+");
  // E.164: a leading + then 8–15 digits, first digit non-zero. Bare digits
  // are accepted too and assumed to already carry a country code.
  if (/^\+[1-9][0-9]{7,14}$/.test(withPlus)) return withPlus;
  if (/^[1-9][0-9]{7,14}$/.test(withPlus)) return `+${withPlus}`;
  return null;
}

export function generateInvoiceNumber(year: number, sequential: number): string {
  return `HAJR-${year}-${String(sequential).padStart(6, "0")}`;
}

export function generatePayrollNumber(year: number, month: number, sequential: number): string {
  return `PAY-${year}-${String(month).padStart(2, "0")}-${String(sequential).padStart(3, "0")}`;
}
