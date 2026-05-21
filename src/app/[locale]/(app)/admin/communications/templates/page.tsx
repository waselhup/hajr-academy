import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { TemplatesClient } from "./templates-client";

export const dynamic = "force-dynamic";

/** /admin/communications/templates — email template manager. */
export default async function AdminTemplatesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Comms");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("templates")}</h1>
      <TemplatesClient />
    </div>
  );
}
