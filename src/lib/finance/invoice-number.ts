/**
 * Sequential invoice-number generation.
 *
 * Format: HAJR-YYYY-NNNNNN — a per-year, zero-padded, gap-free counter.
 * The 6-digit width matches numbers already issued by Phase 1
 * (`@/lib/invoice`), so this module simply re-exports the canonical
 * implementation rather than introducing a divergent format.
 */
export { nextInvoiceNumber as generateInvoiceNumber, buildInvoiceNumber } from "@/lib/invoice";
