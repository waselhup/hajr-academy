import type { Metadata } from "next";
import {
  EarlyRegistrationView,
  earlyRegistrationMetadata,
} from "./early-registration/view";

export const dynamic = "force-dynamic";

/**
 * The homepage.
 *
 * The Early Registration 2026 design replaced the previous landing page. The
 * old one is still served at /classic (noindex) so nothing is lost while the
 * new page is in the field.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return earlyRegistrationMetadata(locale);
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <EarlyRegistrationView locale={locale} />;
}
