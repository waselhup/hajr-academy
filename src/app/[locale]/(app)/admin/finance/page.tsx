import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function AdminFinancePage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.finance")} phase={7} description="MRR, outstanding, invoices, salaries, ZATCA." />;
}
