import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function TeacherAttendancePage() {
  await requireRole("TEACHER");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.attendance")} phase={3} description="Auto-prefilled from Zoom webhook + manual override." />;
}
