import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function AdminCommsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.communications")} phase={5} description="Chat monitoring and flagged messages." />;
}
