// ZATCA Phase 1 TLV QR encoder. Implemented in Phase 7 (Finance).
// Stub here so types compile through Phase 1.

export interface ZatcaInvoiceData {
  sellerNameAr: string;
  vatNumber: string;
  invoiceDateUtc: Date;
  invoiceTotalWithVat: number;
  vatAmount: number;
}

export function encodeZatcaQr(_: ZatcaInvoiceData): string {
  // Implemented in Phase 7. TLV: [tag][length][value] in base64.
  return "";
}
