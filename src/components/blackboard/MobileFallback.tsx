"use client";

import { useTranslations } from "next-intl";

export function MobileFallback() {
  const t = useTranslations("Blackboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navy p-6 text-center lg:hidden">
      <div className="space-y-4">
        <div className="text-4xl">📱</div>
        <h2 className="text-xl font-bold text-white">{t("mobileWarning")}</h2>
        <p className="text-white/70 text-sm">{t("mobileWarningDesc")}</p>
      </div>
    </div>
  );
}
