import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { AdminBlackboardsClient } from "./admin-blackboards-client";

export default async function AdminBlackboardsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Blackboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("adminTitle")}</h1>
      <AdminBlackboardsClient />
    </div>
  );
}
