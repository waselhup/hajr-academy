import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function ParentLinkPage() {
  await requireRole("PARENT");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.children")} phase={9} description="Link a new child via invite code or QR." />;
}
