import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/rbac";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

/** /notifications — the full notifications page (all roles). */
export default async function NotificationsPage() {
  await requireSession();
  const t = await getTranslations("Notifications");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <NotificationsClient />
    </div>
  );
}
