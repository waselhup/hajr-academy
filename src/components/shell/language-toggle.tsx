"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.replace(pathname, { locale: next })}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className="gap-2"
    >
      <Globe className="h-4 w-4" />
      {/* Hide the word label on phones so the topbar cluster fits 360px; the
          globe + aria-label keep it usable/accessible. */}
      <span className="hidden sm:inline">{locale === "ar" ? "English" : "العربية"}</span>
    </Button>
  );
}
