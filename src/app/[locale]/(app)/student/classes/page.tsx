import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function StudentClassesPage() {
  await requireRole("STUDENT");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.myClasses")} phase={3} description="Enrolled classes + join button." />;
}
