/**
 * ZATCA Phase 1 (e-invoicing "generation phase") QR encoding.
 *
 * Saudi tax authority (ZATCA / فاتورة) requires every simplified tax
 * invoice to carry a QR code with five mandatory fields, encoded as
 * TLV (Tag-Length-Value) and Base64-wrapped:
 *
 *   Tag 1 — Seller name
 *   Tag 2 — VAT registration number
 *   Tag 3 — Invoice timestamp (ISO 8601)
 *   Tag 4 — Invoice total (with VAT)
 *   Tag 5 — VAT total
 *
 * This module produces the Base64 TLV string and a scannable PNG data URL.
 */

import QRCode from "qrcode";

export interface ZatcaInvoiceData {
  /** Seller legal name (Arabic recommended per ZATCA). */
  sellerName: string;
  /** 15-digit VAT registration number. */
  vatNumber: string;
  /** Invoice issue timestamp. */
  timestamp: Date | string;
  /** Invoice total including VAT, in SAR. */
  totalWithVat: number | string;
  /** VAT amount, in SAR. */
  vatAmount: number | string;
}

/**
 * Encode a single TLV field.
 *
 * Layout: [1 byte tag][1 byte length][N bytes UTF-8 value]. ZATCA Phase 1
 * field values are short enough to fit in a single length byte (< 256
 * bytes); a multi-byte length is not required at this phase.
 */
function encodeTLV(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, "utf-8");
  return Buffer.concat([
    Buffer.from([tag]),
    Buffer.from([valueBuffer.length]),
    valueBuffer,
  ]);
}

/** Normalise a money input to a fixed 2-dp string ("250.00"). */
function money(v: number | string): string {
  return Number(v).toFixed(2);
}

/** Normalise a timestamp input to an ISO 8601 string. */
function isoTimestamp(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

/**
 * Build the Base64-encoded TLV payload for an invoice's ZATCA QR code.
 * This is the string stored on `Invoice.zatcaQrData`.
 */
export function generateZatcaQrData(invoice: ZatcaInvoiceData): string {
  const tlv = Buffer.concat([
    encodeTLV(1, invoice.sellerName),
    encodeTLV(2, invoice.vatNumber),
    encodeTLV(3, isoTimestamp(invoice.timestamp)),
    encodeTLV(4, money(invoice.totalWithVat)),
    encodeTLV(5, money(invoice.vatAmount)),
  ]);
  return tlv.toString("base64");
}

/** Render a Base64 TLV payload to a PNG data URL for embedding. */
export async function generateZatcaQrImage(
  qrData: string,
  width = 200
): Promise<string> {
  return QRCode.toDataURL(qrData, { width, margin: 1 });
}

/** Decode a Base64 TLV payload back to its fields (for verification/tests). */
export function decodeZatcaQrData(base64: string): Record<number, string> {
  const buf = Buffer.from(base64, "base64");
  const out: Record<number, string> = {};
  let i = 0;
  while (i + 2 <= buf.length) {
    const tag = buf[i];
    const len = buf[i + 1];
    const value = buf.subarray(i + 2, i + 2 + len).toString("utf-8");
    out[tag] = value;
    i += 2 + len;
  }
  return out;
}

/** Seller identity from environment, with sane Hajr defaults. */
export function getSellerInfo(): {
  sellerNameAr: string;
  sellerNameEn: string;
  vatNumber: string;
  crNumber: string;
} {
  return {
    sellerNameAr:
      process.env.ZATCA_SELLER_NAME_AR ?? "معهد حسين حسن العيسى للتعليم",
    sellerNameEn:
      process.env.ZATCA_SELLER_NAME_EN ?? "HAJR A° English Academy",
    vatNumber: process.env.ZATCA_VAT_NUMBER ?? "300000000000003",
    crNumber: process.env.ZATCA_CR_NUMBER ?? "",
  };
}

/**
 * Convenience: build both the TLV string and the QR image for an invoice,
 * using the seller identity from the environment.
 */
export async function buildInvoiceZatcaQr(params: {
  timestamp: Date | string;
  totalWithVat: number;
  vatAmount: number;
}): Promise<{ qrData: string; qrImage: string; vatNumber: string }> {
  const seller = getSellerInfo();
  const qrData = generateZatcaQrData({
    sellerName: seller.sellerNameAr,
    vatNumber: seller.vatNumber,
    timestamp: params.timestamp,
    totalWithVat: params.totalWithVat,
    vatAmount: params.vatAmount,
  });
  const qrImage = await generateZatcaQrImage(qrData);
  return { qrData, qrImage, vatNumber: seller.vatNumber };
}

/** Standard Saudi VAT rate. */
export const VAT_RATE = 0.15;

/**
 * True only when a REAL VAT registration number is configured.
 *
 * The ZATCA sandbox ships 300000000000003 as a sample; treating it as a
 * registration would make the platform issue tax invoices in the name of a
 * number the seller does not hold.
 */
export function isVatRegistered(): boolean {
  const v = (process.env.ZATCA_VAT_NUMBER ?? "").trim();
  return !!v && v !== "300000000000003";
}

/**
 * The rate to actually apply.
 *
 * A seller below the mandatory registration threshold must NOT collect VAT.
 * Charging 15% without a registration — and printing a "tax invoice" that
 * implies one — is the offence, not the missing number. Until the academy
 * registers, this returns 0 and invoices are issued as plain invoices.
 */
export function effectiveVatRate(): number {
  return isVatRegistered() ? VAT_RATE : 0;
}

/**
 * Compute VAT-inclusive totals from a pre-tax subtotal and optional
 * discount. Discount is applied before VAT. All values rounded to 2 dp.
 */
export function calcVatTotals(
  subtotal: number,
  discount = 0,
  vatRate = effectiveVatRate()
): { subtotal: number; discount: number; netSubtotal: number; vat: number; total: number } {
  const sub = +Number(subtotal).toFixed(2);
  const disc = +Math.min(Number(discount), sub).toFixed(2);
  const net = +(sub - disc).toFixed(2);
  const vat = +(net * vatRate).toFixed(2);
  const total = +(net + vat).toFixed(2);
  return { subtotal: sub, discount: disc, netSubtotal: net, vat, total };
}
