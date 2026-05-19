import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function AdminLabPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.lab")} phase={6} description="Manage lab modules and student progress." />;
}
