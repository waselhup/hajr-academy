import { getLocale, getTranslations } from "next-intl/server";
import { PolicyShell } from "../_shell";

export const dynamic = "force-dynamic";

export default async function RefundPolicyPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <PolicyShell
      isAr={locale === "ar"}
      title={t("Policies.refundPolicyTitle")}
      body={t("Policies.refundPolicyBody")}
      lastUpdatedLabel={t("Policies.lastUpdated")}
      whatsappLabel={t("Landing.whatsappFabLabel")}
      loginLabel={t("Landing.ctaLogin")}
      joinLabel={t("Landing.ctaStickyMobile")}
    />
  );
}
