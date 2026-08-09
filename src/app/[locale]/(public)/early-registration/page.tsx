import { redirect, permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /early-registration now lives at the site root.
 *
 * A permanent redirect rather than a second copy of the page: two URLs
 * serving identical content split their own search ranking, and the campaign
 * links already in the wild (ads, WhatsApp, the printed QR) must keep
 * working. Query strings — the UTM tags — are preserved by the redirect.
 */
export default async function EarlyRegistrationRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}`);
  // Unreachable; keeps the return type honest for the type checker.
  redirect(`/${locale}`);
}
