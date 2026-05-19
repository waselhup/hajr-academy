import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function StudentStepPage() {
  await requireRole("STUDENT");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.step")} phase={6} description="STEP practice + mock tests." />;
}
