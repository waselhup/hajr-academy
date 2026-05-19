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

export function generateInvoiceNumber(year: number, sequential: number): string {
  return `HAJR-${year}-${String(sequential).padStart(6, "0")}`;
}

export function generatePayrollNumber(year: number, month: number, sequential: number): string {
  return `PAY-${year}-${String(month).padStart(2, "0")}-${String(sequential).padStart(3, "0")}`;
}
