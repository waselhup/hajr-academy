/**
 * The academy's legal identity — what a Saudi e-commerce seller has to
 * publish, and what belongs on an invoice.
 *
 * Read from the environment, never hard-coded: a wrong number here is a
 * compliance problem, so it has one home and the code can say honestly
 * whether a value is real or absent.
 *
 * Two names, deliberately: the REGISTERED entity ("معهد حسين حسن العيسى
 * للتعليم") is what the commercial registration says and what an invoice must
 * carry; "أكاديمية هجر" is the trading name customers know.
 *
 * VAT: the academy is below the mandatory registration threshold and is NOT
 * registered. `isVatRegistered` is therefore false, and the platform charges
 * no VAT and issues plain invoices — see effectiveVatRate() in zatca.ts.
 * Setting ZATCA_VAT_NUMBER to a real number flips all of that on at once.
 */

/** The ZATCA sandbox sample. Treated as "no registration". */
const PLACEHOLDER_VAT = "300000000000003";

export interface LegalIdentity {
  /** Registered entity name, as on the commercial registration. */
  nameAr: string;
  nameEn: string;
  /** Trading name shown to customers. */
  tradeNameAr: string;
  tradeNameEn: string;
  /** Unified national number / commercial registration, or null. */
  crNumber: string | null;
  /** 15-digit VAT registration number, or null when not registered. */
  vatNumber: string | null;
  isVatRegistered: boolean;
  addressAr: string;
  addressEn: string;
  email: string;
  /** Digits only, international format, for wa.me / tel: links. */
  whatsapp: string;
  phoneDisplay: string;
  /** Bank details for transfer payments — shown only where relevant. */
  bank: { nameAr: string; nameEn: string; iban: string; accountName: string } | null;
}

export function getLegalIdentity(): LegalIdentity {
  const vatRaw = (process.env.ZATCA_VAT_NUMBER ?? "").trim();
  const crRaw = (process.env.ZATCA_CR_NUMBER ?? "").trim();
  const iban = (process.env.HAJR_BANK_IBAN ?? "").trim();

  const vatNumber = !vatRaw || vatRaw === PLACEHOLDER_VAT ? null : vatRaw;

  const nameAr = process.env.ZATCA_SELLER_NAME_AR ?? "معهد حسين حسن العيسى للتعليم";
  const nameEn =
    process.env.ZATCA_SELLER_NAME_EN ?? "Hussein Hassan Al-Essa Institute for Education";

  return {
    nameAr,
    nameEn,
    tradeNameAr: "أكاديمية هجر",
    tradeNameEn: "HAJR A° Academy",
    crNumber: crRaw || null,
    vatNumber,
    isVatRegistered: !!vatNumber,
    addressAr: "الأحساء، المملكة العربية السعودية",
    addressEn: "Al Ahsa, Kingdom of Saudi Arabia",
    email: "hajracademy@gmail.com",
    whatsapp: "966502456651",
    phoneDisplay: "+966 50 245 6651",
    bank: iban
      ? {
          nameAr: process.env.HAJR_BANK_NAME_AR ?? "مصرف الراجحي",
          nameEn: process.env.HAJR_BANK_NAME_EN ?? "Al Rajhi Bank",
          iban,
          accountName: nameAr,
        }
      : null,
  };
}
