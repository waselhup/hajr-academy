import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function LocaleNotFound() {
  const t = await getTranslations();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-ivory p-6 text-center">
      <span className="text-6xl font-extrabold text-brand-rose">404</span>
      <h1 className="mt-4 text-2xl font-bold text-brand-navy">{t("Common.notFound")}</h1>
      <Button asChild className="mt-6">
        <Link href="/">{t("Common.back")}</Link>
      </Button>
    </div>
  );
}
