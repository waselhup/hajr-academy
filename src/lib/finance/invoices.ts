/**
 * Invoice creation + lifecycle helpers (Phase 8).
 *
 * `createInvoice` is the single way invoices are minted. It:
 *   - allocates a sequential invoice number,
 *   - computes VAT-inclusive totals server-side (never trusting the client),
 *   - generates the mandatory ZATCA Phase 1 QR payload,
 *   - writes both the legacy (`*Sar`, `month`, `year`, `status`) and Phase 8
 *     (`type`, `invoiceStatus`, `discountSar`, `lineItems`, …) columns so
 *     existing Phase 1 tooling keeps working,
 *   - renders + uploads the bilingual invoice document (best-effort).
 *
 * All amounts are SAR. VAT is always 15%.
 */

import { prisma } from "@/lib/prisma";
import type { InvoiceType, PaymentStatus, Prisma } from "@prisma/client";
import { generateInvoiceNumber } from "./invoice-number";
import { buildInvoiceZatcaQr, calcVatTotals, VAT_RATE } from "./zatca";
import { generateInvoicePdf, type InvoiceLineItem } from "./invoice-pdf";
import { uploadInvoiceDocument, getInvoiceSignedUrl } from "./invoice-storage";
import { logAudit } from "@/lib/audit";

export interface CreateInvoiceInput {
  studentId: string;
  subscriptionId?: string | null;
  schoolId?: string | null;
  type?: InvoiceType;
  /** Pre-VAT, pre-discount line items. `total` is recomputed defensively. */
  lineItems: Array<Omit<InvoiceLineItem, "vatRate" | "total"> & { vatRate?: number }>;
  /** Discount in SAR, applied before VAT. */
  discount?: number;
  /** Days until due (default 7). */
  dueInDays?: number;
  notes?: string | null;
  notesAr?: string | null;
  /** Optional package tag for legacy reporting tools. */
  packageType?: "ESSENTIAL" | "INTEGRATED" | "PRIVATE" | "SCHOOL" | null;
}

/**
 * Create an invoice. Returns the persisted row (with a freshly minted
 * number, ZATCA QR, and — best-effort — an uploaded document URL).
 */
export async function createInvoice(input: CreateInvoiceInput) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Recompute every line total server-side; sum to the pre-tax subtotal.
  const lineItems: InvoiceLineItem[] = input.lineItems.map((li) => {
    const vatRate = li.vatRate ?? VAT_RATE;
    const total = +(li.quantity * li.unitPrice).toFixed(2);
    return {
      description: li.description,
      descriptionAr: li.descriptionAr,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      vatRate,
      total,
    };
  });
  const subtotal = +lineItems.reduce((s, li) => s + li.total, 0).toFixed(2);

  const totals = calcVatTotals(subtotal, input.discount ?? 0);

  const invoiceNumber = await generateInvoiceNumber(year);
  const dueDate = new Date(
    now.getTime() + (input.dueInDays ?? 7) * 86400_000
  );

  // ZATCA Phase 1 QR — mandatory on every invoice, even in test mode.
  const { qrData, vatNumber } = await buildInvoiceZatcaQr({
    timestamp: now,
    totalWithVat: totals.total,
    vatAmount: totals.vat,
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      studentId: input.studentId,
      subscriptionId: input.subscriptionId ?? null,
      schoolId: input.schoolId ?? null,
      packageType: input.packageType ?? null,
      month,
      year,
      type: input.type ?? "SUBSCRIPTION",
      status: "PENDING",
      invoiceStatus: "PENDING",
      subtotalSar: totals.subtotal,
      discountSar: totals.discount,
      vatSar: totals.vat,
      totalSar: totals.total,
      zatcaQrData: qrData,
      vatNumber,
      issuedAt: now,
      dueDate,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      notes: input.notes ?? null,
      notesAr: input.notesAr ?? null,
    },
  });

  // Render + upload the bilingual document. Best-effort: a storage failure
  // must not block invoice creation.
  try {
    const pdf = await renderInvoiceDocument(invoice.id);
    if (pdf) {
      const up = await uploadInvoiceDocument({
        invoiceNumber,
        year,
        body: pdf,
      });
      if (up.ok && up.path) {
        const url = await getInvoiceSignedUrl(up.path, 7 * 86400);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl: url ?? up.path },
        });
      }
    }
  } catch (e) {
    console.error("[invoices] document generation failed:", e);
  }

  await logAudit({
    action: "INVOICE_CREATED",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: {
      invoiceNumber,
      total: totals.total,
      type: input.type ?? "SUBSCRIPTION",
    },
  });

  return invoice;
}

/** Render an invoice's bilingual document Buffer from its persisted row. */
export async function renderInvoiceDocument(
  invoiceId: string
): Promise<Buffer | null> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: {
        include: {
          user: { select: { name: true, nameAr: true, email: true, phone: true } },
        },
      },
    },
  });
  if (!inv) return null;

  const lineItems = (inv.lineItems as unknown as InvoiceLineItem[]) ?? [];

  return generateInvoicePdf({
    invoiceNumber: inv.invoiceNumber,
    issuedAt: inv.issuedAt,
    dueDate: inv.dueDate,
    status: inv.invoiceStatus,
    studentName: inv.student.user.name,
    studentNameAr: inv.student.user.nameAr,
    studentEmail: inv.student.user.email,
    studentPhone: inv.student.user.phone,
    subtotal: Number(inv.subtotalSar),
    discount: Number(inv.discountSar),
    vatAmount: Number(inv.vatSar),
    totalAmount: Number(inv.totalSar),
    lineItems,
    notes: inv.notes,
    notesAr: inv.notesAr,
  });
}

/**
 * Mark an invoice as paid and keep the legacy + Phase 8 status columns in
 * sync. Idempotent — a second call on an already-paid invoice is a no-op.
 */
export async function markInvoicePaid(
  invoiceId: string,
  paymentMethod?:
    | "MOYASAR_CARD"
    | "MADA"
    | "APPLE_PAY"
    | "STC_PAY"
    | "BANK_TRANSFER"
    | "CASH"
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });
  if (!inv) return { ok: false };
  if (inv.status === "PAID") return { ok: true, alreadyPaid: true };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      invoiceStatus: "PAID",
      paidAt: new Date(),
      paymentMethod: paymentMethod ?? "MOYASAR_CARD",
    },
  });
  await logAudit({
    action: "INVOICE_PAID",
    entity: "Invoice",
    entityId: invoiceId,
    metadata: { paymentMethod: paymentMethod ?? "MOYASAR_CARD" },
  });
  return { ok: true };
}

/** Keep both status columns aligned for non-paid transitions. */
const STATUS_PAIR: Record<string, { legacy: PaymentStatus; rich: string }> = {
  PENDING: { legacy: "PENDING", rich: "PENDING" },
  OVERDUE: { legacy: "OVERDUE", rich: "OVERDUE" },
  CANCELLED: { legacy: "WAIVED", rich: "CANCELLED" },
  REFUNDED: { legacy: "REFUNDED", rich: "REFUNDED" },
  DRAFT: { legacy: "PENDING", rich: "DRAFT" },
};

/** Transition an invoice to a non-paid status, syncing both columns. */
export async function setInvoiceStatus(
  invoiceId: string,
  status: "PENDING" | "OVERDUE" | "CANCELLED" | "REFUNDED" | "DRAFT"
): Promise<void> {
  const pair = STATUS_PAIR[status];
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: pair.legacy,
      invoiceStatus: pair.rich as never,
    },
  });
  await logAudit({
    action: "INVOICE_STATUS_CHANGED",
    entity: "Invoice",
    entityId: invoiceId,
    metadata: { status },
  });
}
