import { redirect } from "next/navigation";
import { listActiveProducts, getProduct } from "@/lib/finance/catalog";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

/**
 * /checkout — public purchase form.
 *
 * `?product=<slug>` preselects a catalogue item; the buyer can switch to
 * any other item here. Prices come from the catalogue, never the URL.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; package?: string; promo?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const products = await listActiveProducts();
  if (products.length === 0) {
    // Catalogue unavailable — never show a purchase form with no price.
    redirect(`/${locale}#packages`);
  }

  // A slug that names nothing on sale must not silently sell something
  // else — send the buyer back to the price list rather than swapping the
  // product under them.
  const requested = sp.product ? await getProduct(sp.product) : null;
  if (sp.product && !requested) {
    redirect(`/${locale}#packages`);
  }
  const selected = requested ?? products[0];

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <CheckoutForm
        locale={locale}
        products={products.map((p) => ({
          slug: p.slug,
          name: locale === "ar" ? p.nameAr : p.nameEn,
          desc: locale === "ar" ? p.descAr : p.descEn,
          price: p.priceSar,
          unit: locale === "ar" ? p.unitAr : p.unitEn,
          group: p.group,
          requiresGradeLevel: p.requiresGradeLevel,
        }))}
        initialSlug={selected.slug}
        initialPromo={(sp.promo ?? "").slice(0, 40)}
      />
    </div>
  );
}
