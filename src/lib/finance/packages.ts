/**
 * Subscription package catalogue.
 *
 * Pricing is fixed in code (matches the published pricing sheet). Prices
 * are pre-VAT, in SAR; VAT is always computed server-side at 15%.
 */
import type { PackageType } from "@prisma/client";

export interface PackageDefinition {
  key: Exclude<PackageType, "SCHOOL">;
  nameAr: string;
  nameEn: string;
  /** Pre-VAT monthly price in SAR. */
  pricePerMonth: number;
  sessionsPerMonth: number;
  featuresAr: string[];
  featuresEn: string[];
  labAccess: boolean;
}

export const PACKAGES: Record<
  Exclude<PackageType, "SCHOOL">,
  PackageDefinition
> = {
  ESSENTIAL: {
    key: "ESSENTIAL",
    nameAr: "الباقة الأساسية",
    nameEn: "Essential Package",
    pricePerMonth: 250,
    sessionsPerMonth: 8,
    featuresAr: ["٨ حصص جماعية شهرياً", "مواد تعليمية أساسية"],
    featuresEn: ["8 group sessions / month", "Basic materials"],
    labAccess: false,
  },
  INTEGRATED: {
    key: "INTEGRATED",
    nameAr: "الباقة المتكاملة",
    nameEn: "Integrated Package",
    pricePerMonth: 300,
    sessionsPerMonth: 12,
    featuresAr: [
      "١٢ حصة جماعية شهرياً",
      "الوصول إلى مختبر اللغة",
      "مواد ممارسة وتدريب",
    ],
    featuresEn: [
      "12 group sessions / month",
      "English Lab access",
      "Practice materials",
    ],
    labAccess: true,
  },
  PRIVATE: {
    key: "PRIVATE",
    nameAr: "الباقة الخاصة",
    nameEn: "Private Package",
    pricePerMonth: 800,
    sessionsPerMonth: 16,
    featuresAr: [
      "١٦ حصة فردية شهرياً",
      "الوصول إلى مختبر اللغة",
      "دعم ذو أولوية",
    ],
    featuresEn: [
      "16 private 1-on-1 sessions / month",
      "English Lab access",
      "Priority support",
    ],
    labAccess: true,
  },
  STEP_PREP_PKG: {
    key: "STEP_PREP_PKG",
    nameAr: "باقة التحضير لاختبار ستيب",
    nameEn: "STEP Prep Package",
    // Placeholder — owner to confirm/edit pricing in admin UI.
    pricePerMonth: 600,
    sessionsPerMonth: 16,
    featuresAr: [
      "١٦ حصة مكثفة شهرياً",
      "اختبارات تجريبية بأسلوب ستيب",
      "ملاحظات الخبراء",
    ],
    featuresEn: [
      "16 intensive sessions / month",
      "STEP-style mock exams",
      "Expert feedback",
    ],
    labAccess: true,
  },
  IELTS_PREP_PKG: {
    key: "IELTS_PREP_PKG",
    nameAr: "باقة التحضير لاختبار آيلتس",
    nameEn: "IELTS Prep Package",
    // Placeholder — owner to confirm/edit pricing in admin UI.
    pricePerMonth: 800,
    sessionsPerMonth: 16,
    featuresAr: [
      "تحضير شامل آيلتس أكاديمي + عام",
      "التركيز على المحادثة والكتابة",
      "تقييمات أسبوعية",
    ],
    featuresEn: [
      "Comprehensive IELTS Academic + General prep",
      "Speaking & Writing focus",
      "Weekly assessments",
    ],
    labAccess: true,
  },
};

/** All packages as an ordered list (cheapest first). */
export const PACKAGE_LIST: PackageDefinition[] = [
  PACKAGES.ESSENTIAL,
  PACKAGES.INTEGRATED,
  PACKAGES.PRIVATE,
  PACKAGES.STEP_PREP_PKG,
  PACKAGES.IELTS_PREP_PKG,
];

/** VAT rate applied to every subscription. */
export const VAT_RATE = 0.15;

/** Look up a package definition by type; throws on unknown/SCHOOL. */
export function getPackage(type: string): PackageDefinition {
  const pkg = PACKAGES[type as Exclude<PackageType, "SCHOOL">];
  if (!pkg) throw new Error(`Unknown package type: ${type}`);
  return pkg;
}

/** Is this a valid, subscribable package type? */
export function isSubscribablePackage(
  type: string
): type is Exclude<PackageType, "SCHOOL"> {
  return (
    type === "ESSENTIAL" ||
    type === "INTEGRATED" ||
    type === "PRIVATE" ||
    type === "STEP_PREP_PKG" ||
    type === "IELTS_PREP_PKG"
  );
}
