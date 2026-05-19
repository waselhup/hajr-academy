import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function AdminSettingsPage() {
  await requireRole("SUPER_ADMIN");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.settings")} phase={2} description="System config — VAT rate, business hours, keyword filter." />;
}
