/**
 * The academy's legal identity — the details a Saudi e-commerce seller has to
 * publish and print on tax invoices.
 *
 * Read from the environment, never hard-coded: a wrong VAT number on an
 * invoice is a compliance problem, so the value has one home and the code can
 * say honestly whether it is real or still a placeholder.
 *
 * `ZATCA_VAT_NUMBER` ships with the ZATCA sandbox placeholder
 * (300000000000003). Anything equal to it is treated as NOT configured, so
 * the site shows nothing rather than publishing a fake number.
 */

const PLACEHOLDER_VAT = "300000000000003";

export interface LegalIdentity {
  nameAr: string;
  nameEn: string;
  /** 15-digit Saudi VAT registration number, or null when unset. */
  vatNumber: string | null;
  /** 10-digit commercial registration number, or null when unset. */
  crNumber: string | null;
  addressAr: string;
  addressEn: string;
  email: string;
  /** Digits only, international format, for wa.me / tel: links. */
  whatsapp: string;
  phoneDisplay: string;
  /** True only when BOTH statutory numbers are real. */
  isComplete: boolean;
}

export function getLegalIdentity(): LegalIdentity {
  const vatRaw = (process.env.ZATCA_VAT_NUMBER ?? "").trim();
  const crRaw = (process.env.ZATCA_CR_NUMBER ?? "").trim();

  const vatNumber = !vatRaw || vatRaw === PLACEHOLDER_VAT ? null : vatRaw;
  const crNumber = crRaw || null;

  return {
    nameAr: process.env.ZATCA_SELLER_NAME_AR ?? "أكاديمية هجر للغة الإنجليزية",
    nameEn: process.env.ZATCA_SELLER_NAME_EN ?? "HAJR A° English Academy",
    vatNumber,
    crNumber,
    addressAr: "الأحساء، المملكة العربية السعودية",
    addressEn: "Al Ahsa, Kingdom of Saudi Arabia",
    email: "hajracademy@gmail.com",
    whatsapp: "966502456651",
    phoneDisplay: "+966 50 245 6651",
    isComplete: !!vatNumber && !!crNumber,
  };
}
