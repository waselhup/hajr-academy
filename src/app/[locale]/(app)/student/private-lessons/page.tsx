import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function StudentPrivatePage() {
  await requireRole("STUDENT");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.privateLessons")} phase={3} description="My 1-on-1 schedule." />;
}
