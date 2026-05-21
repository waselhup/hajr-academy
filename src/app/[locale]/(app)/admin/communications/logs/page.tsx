import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { LogsClient } from "./logs-client";

export const dynamic = "force-dynamic";

/** /admin/communications/logs — searchable message log. */
export default async function AdminLogsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Comms");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("logs")}</h1>
      <LogsClient />
    </div>
  );
}
