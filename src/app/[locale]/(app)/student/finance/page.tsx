import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function StudentFinancePage() {
  await requireRole("STUDENT");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.myInvoices")} phase={7} description="My invoices + Pay Now (Moyasar)." />;
}
