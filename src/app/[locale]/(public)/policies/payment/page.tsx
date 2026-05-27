import { getLocale, getTranslations } from "next-intl/server";
import { PolicyShell } from "../_shell";

export const dynamic = "force-dynamic";

export default async function PaymentPolicyPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <PolicyShell
      isAr={locale === "ar"}
      title={t("Policies.paymentPolicyTitle")}
      body={t("Policies.paymentPolicyBody")}
      lastUpdatedLabel={t("Policies.lastUpdated")}
      whatsappLabel={t("Landing.whatsappFabLabel")}
      loginLabel={t("Landing.ctaLogin")}
      joinLabel={t("Landing.ctaStickyMobile")}
    />
  );
}
