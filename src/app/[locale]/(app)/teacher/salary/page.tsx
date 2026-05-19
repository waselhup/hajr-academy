import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function TeacherSalaryPage() {
  await requireRole("TEACHER");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.mySalary")} phase={7} description="Salary history + downloadable PDF slips." />;
}
