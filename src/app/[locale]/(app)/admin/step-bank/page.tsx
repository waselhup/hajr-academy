import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function AdminStepBankPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.stepBank")} phase={6} description="STEP question bank — CSV import, manage." />;
}
