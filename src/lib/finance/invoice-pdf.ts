/**
 * Bilingual (Arabic-primary / English-secondary) invoice document generator.
 *
 * Produces a self-contained, print-optimised HTML document. HTML is used
 * deliberately: it renders Arabic script and RTL layout correctly across
 * every viewer, embeds the ZATCA QR as a data URL, and converts cleanly to
 * PDF via the browser's "Save as PDF" / print pipeline. The output is a
 * `Buffer` and is uploaded to the private `invoices` Supabase bucket.
 *
 * The document carries the mandatory ZATCA Phase 1 elements: seller name,
 * VAT number, timestamp, VAT-inclusive total, VAT amount, and the QR code.
 */

import { buildInvoiceZatcaQr, getSellerInfo } from "./zatca";
import { BRAND } from "@/lib/brand";

const C = BRAND.palette;

export interface InvoiceLineItem {
  description: string;
  descriptionAr: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface InvoiceDocumentData {
  invoiceNumber: string;
  issuedAt: Date;
  dueDate: Date;
  status: string;
  // Buyer
  studentName: string;
  studentNameAr?: string | null;
  studentEmail?: string | null;
  studentPhone?: string | null;
  // Amounts (SAR)
  subtotal: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  // Line items
  lineItems: InvoiceLineItem[];
  // Notes
  notes?: string | null;
  notesAr?: string | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sar(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Bilingual status label. */
function statusLabel(status: string): { ar: string; en: string; color: string } {
  const map: Record<string, { ar: string; en: string; color: string }> = {
    PAID: { ar: "مدفوعة", en: "Paid", color: "#27AE60" },
    PENDING: { ar: "قيد الانتظار", en: "Pending", color: "#F39C12" },
    OVERDUE: { ar: "متأخرة", en: "Overdue", color: "#E74C3C" },
    DRAFT: { ar: "مسودة", en: "Draft", color: "#8A8580" },
    CANCELLED: { ar: "ملغاة", en: "Cancelled", color: "#8A8580" },
    REFUNDED: { ar: "مُستردة", en: "Refunded", color: "#B86E7B" },
    PARTIALLY_REFUNDED: { ar: "مُستردة جزئياً", en: "Partially refunded", color: "#B86E7B" },
  };
  return map[status] ?? { ar: status, en: status, color: "#8A8580" };
}

/**
 * Render the invoice as a print-optimised bilingual HTML document and
 * return it as a Buffer (UTF-8). Includes the ZATCA QR code.
 */
export async function generateInvoicePdf(
  invoice: InvoiceDocumentData
): Promise<Buffer> {
  const seller = getSellerInfo();
  const { qrImage } = await buildInvoiceZatcaQr({
    timestamp: invoice.issuedAt,
    totalWithVat: invoice.totalAmount,
    vatAmount: invoice.vatAmount,
  });
  const st = statusLabel(invoice.status);

  const rows = invoice.lineItems
    .map(
      (li, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>
          <div class="desc-ar">${esc(li.descriptionAr || li.description)}</div>
          <div class="desc-en">${esc(li.description)}</div>
        </td>
        <td class="num">${li.quantity}</td>
        <td class="num">${sar(li.unitPrice)}</td>
        <td class="num">${(li.vatRate * 100).toFixed(0)}%</td>
        <td class="num strong">${sar(li.total)}</td>
      </tr>`
    )
    .join("");

  return Buffer.from(
    `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(invoice.invoiceNumber)} — HAJR Academy</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --navy: ${C.navy};
    --rose: ${C.rose};
    --ivory: ${C.ivory};
    --mint: ${C.mint};
    --ink: ${C.deepNavy};
    --muted: ${C.textMuted};
    --line: ${C.border};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Inter', sans-serif;
    color: var(--ink);
    background: #f3f1ec;
    padding: 24px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(44,62,80,.08);
  }
  .head {
    background: var(--navy);
    color: #fff;
    padding: 28px 32px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }
  .brand-mark {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 26px;
    letter-spacing: .5px;
  }
  .brand-mark sup { color: var(--rose); font-size: 14px; }
  .seller-ar { font-size: 15px; font-weight: 600; margin-top: 6px; }
  .seller-en { font-size: 12px; opacity: .75; font-family: 'Inter', sans-serif; }
  .seller-meta { font-size: 11px; opacity: .7; margin-top: 8px; line-height: 1.6; }
  .qr-box { text-align: center; }
  .qr-box img { width: 116px; height: 116px; background: #fff; border-radius: 8px; padding: 6px; }
  .qr-box span { display: block; font-size: 9px; opacity: .7; margin-top: 4px; }
  .titlebar {
    padding: 20px 32px;
    background: var(--ivory);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--line);
  }
  .titlebar h1 {
    font-size: 20px;
    color: var(--navy);
  }
  .titlebar h1 small { display:block; font-size: 11px; color: var(--muted); font-family:'Inter',sans-serif; font-weight: 600; }
  .status-pill {
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 999px;
    color: #fff;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 24px 32px;
  }
  .meta-card {
    background: var(--ivory);
    border-radius: 8px;
    padding: 14px 16px;
  }
  .meta-card h3 {
    font-size: 11px;
    color: var(--rose);
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 8px;
    font-family: 'Inter', sans-serif;
  }
  .meta-card .row { font-size: 13px; margin: 3px 0; }
  .meta-card .row .k { color: var(--muted); }
  table { width: 100%; border-collapse: collapse; margin: 0 32px; width: calc(100% - 64px); }
  thead th {
    background: var(--navy);
    color: #fff;
    font-size: 11px;
    padding: 10px 8px;
    text-align: right;
    font-weight: 600;
  }
  tbody td {
    padding: 12px 8px;
    border-bottom: 1px solid var(--line);
    font-size: 13px;
    text-align: right;
    vertical-align: top;
  }
  .desc-ar { font-weight: 600; }
  .desc-en { font-size: 11px; color: var(--muted); font-family: 'Inter', sans-serif; }
  .num { font-family: 'Inter', sans-serif; }
  .strong { font-weight: 700; }
  .totals {
    margin: 20px 32px;
    margin-inline-start: auto;
    width: 320px;
  }
  .totals .line {
    display: flex;
    justify-content: space-between;
    padding: 7px 14px;
    font-size: 13px;
  }
  .totals .line.grand {
    background: var(--navy);
    color: #fff;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    margin-top: 6px;
    padding: 12px 14px;
  }
  .totals .v { font-family: 'Inter', sans-serif; }
  .foot {
    padding: 20px 32px 28px;
    border-top: 1px solid var(--line);
    font-size: 11px;
    color: var(--muted);
    line-height: 1.8;
  }
  .foot strong { color: var(--navy); }
  .zatca-note {
    margin: 0 32px 20px;
    background: var(--mint);
    color: #16604a;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 11px;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="brand-mark">HAJR<sup>A°</sup></div>
        <div class="seller-ar">${esc(seller.sellerNameAr)}</div>
        <div class="seller-en">${esc(seller.sellerNameEn)}</div>
        <div class="seller-meta">
          الرقم الضريبي / VAT: ${esc(seller.vatNumber)}<br/>
          ${seller.crNumber ? `السجل التجاري / CR: ${esc(seller.crNumber)}` : ""}
        </div>
      </div>
      <div class="qr-box">
        <img src="${qrImage}" alt="ZATCA QR" />
        <span>رمز الاستجابة الضريبي · ZATCA QR</span>
      </div>
    </div>

    <div class="titlebar">
      <h1>
        فاتورة ضريبية مبسطة
        <small>SIMPLIFIED TAX INVOICE</small>
      </h1>
      <span class="status-pill" style="background:${st.color}">
        ${esc(st.ar)} · ${esc(st.en)}
      </span>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <h3>Invoice · الفاتورة</h3>
        <div class="row"><span class="k">رقم الفاتورة / No:</span> <span class="num">${esc(invoice.invoiceNumber)}</span></div>
        <div class="row"><span class="k">تاريخ الإصدار / Issued:</span> <span class="num">${fmtDate(invoice.issuedAt)}</span></div>
        <div class="row"><span class="k">تاريخ الاستحقاق / Due:</span> <span class="num">${fmtDate(invoice.dueDate)}</span></div>
      </div>
      <div class="meta-card">
        <h3>Billed to · العميل</h3>
        <div class="row strong">${esc(invoice.studentNameAr || invoice.studentName)}</div>
        <div class="row desc-en">${esc(invoice.studentName)}</div>
        ${invoice.studentEmail ? `<div class="row"><span class="k">${esc(invoice.studentEmail)}</span></div>` : ""}
        ${invoice.studentPhone ? `<div class="row num">${esc(invoice.studentPhone)}</div>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:36px">#</th>
          <th>الوصف · Description</th>
          <th style="width:60px">الكمية<br/>Qty</th>
          <th style="width:90px">السعر<br/>Unit</th>
          <th style="width:60px">ض.ق.م<br/>VAT</th>
          <th style="width:100px">الإجمالي<br/>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="line"><span>المجموع الفرعي · Subtotal</span><span class="v">${sar(invoice.subtotal)} ر.س</span></div>
      ${
        invoice.discount > 0
          ? `<div class="line"><span>الخصم · Discount</span><span class="v">−${sar(invoice.discount)} ر.س</span></div>`
          : ""
      }
      <div class="line"><span>ضريبة القيمة المضافة 15% · VAT</span><span class="v">${sar(invoice.vatAmount)} ر.س</span></div>
      <div class="line grand"><span>الإجمالي · Total</span><span class="v">${sar(invoice.totalAmount)} ر.س</span></div>
    </div>

    <div class="zatca-note">
      تتوافق هذه الفاتورة مع متطلبات المرحلة الأولى للفوترة الإلكترونية (هيئة الزكاة والضريبة والجمارك).
      · This invoice complies with ZATCA Phase 1 e-invoicing requirements.
    </div>

    <div class="foot">
      ${
        invoice.notesAr || invoice.notes
          ? `<div>${esc(invoice.notesAr || "")}${invoice.notesAr && invoice.notes ? " — " : ""}${esc(invoice.notes || "")}</div>`
          : ""
      }
      <div><strong>طرق الدفع · Payment:</strong> مدى · Visa · Mastercard · Apple Pay · STC Pay — عبر بوابة ميسر الآمنة / via Moyasar secure gateway.</div>
      <div><strong>HAJR A° English Academy</strong> · شكراً لاختياركم أكاديمية حجر · Thank you for choosing HAJR Academy.</div>
    </div>
  </div>
</body>
</html>`,
    "utf-8"
  );
}
