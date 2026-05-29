import { CheckoutForm } from "./checkout-form";

const VALID_PACKAGES = [
  "ESSENTIAL",
  "INTEGRATED",
  "PRIVATE",
  "STEP_PREP_PKG",
  "IELTS_PREP_PKG",
] as const;

const PACKAGE_PRICE_SAR: Record<string, number> = {
  ESSENTIAL: 250,
  INTEGRATED: 300,
  PRIVATE: 800,
  STEP_PREP_PKG: 600,
  IELTS_PREP_PKG: 800,
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ package?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const pkg = VALID_PACKAGES.includes(sp.package as any)
    ? (sp.package as string)
    : "INTEGRATED";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <CheckoutForm
        locale={locale}
        packageType={pkg}
        amountSar={PACKAGE_PRICE_SAR[pkg]}
      />
    </div>
  );
}
