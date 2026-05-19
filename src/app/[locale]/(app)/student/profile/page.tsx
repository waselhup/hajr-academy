import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function StudentProfilePage() {
  await requireRole("STUDENT");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.profile")} phase={2} description="Edit profile, change package." />;
}
