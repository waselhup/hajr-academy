import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/rbac";
import { NotificationSettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

/** /settings/notifications — per-user notification preferences. */
export default async function NotificationSettingsPage() {
  await requireSession();
  const t = await getTranslations("NotifSettings");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <NotificationSettingsClient />
    </div>
  );
}
