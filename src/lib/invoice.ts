import { prisma } from "@/lib/prisma";

export function calcInvoiceTotals(subtotal: number, vatRate = 0.15) {
  const sub = +(+subtotal).toFixed(2);
  const vat = +(sub * vatRate).toFixed(2);
  const total = +(sub + vat).toFixed(2);
  return { subtotal: sub, vat, total };
}

export async function nextInvoiceNumber(year: number): Promise<string> {
  const prefix = `HAJR-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  let seq = 1;
  if (last) {
    const m = last.invoiceNumber.match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(6, "0")}`;
}

export function buildInvoiceNumber(year: number, seq: number): string {
  return `HAJR-${year}-${String(seq).padStart(6, "0")}`;
}

export function isGenderAllowed(
  studentGender: "MALE" | "FEMALE",
  classGenderRestriction: "MALE" | "FEMALE" | null
): boolean {
  if (!classGenderRestriction) return true;
  return studentGender === classGenderRestriction;
}
