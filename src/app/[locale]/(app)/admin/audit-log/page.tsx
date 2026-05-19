import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export default async function AdminAuditLogPage() {
  await requireRole("SUPER_ADMIN");
  const t = await getTranslations();
  return <PlaceholderPage title={t("Nav.auditLog")} phase={2} description="Searchable security/audit trail." />;
}
