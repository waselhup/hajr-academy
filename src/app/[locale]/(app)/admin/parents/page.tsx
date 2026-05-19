import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function AdminParentsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.parents")} phase={2} description="Parent CRUD + linked children view." />;
}
