import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function TeacherPrivateLessonsPage() {
  await requireRole("TEACHER");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.privateLessons")} phase={3} description="One-on-one schedule + Zoom links." />;
}
