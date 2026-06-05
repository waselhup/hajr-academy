import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { FeedbackClient } from "./feedback-client";

export const dynamic = "force-dynamic";

/**
 * /admin/feedback — public-survey response inbox. ADMIN / SUPER_ADMIN only.
 * (Both roles listed — requireRole("ADMIN") alone would bounce SUPER_ADMIN.)
 */
export default async function AdminFeedbackPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("AdminFeedback");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-hajr-navy">{t("title")}</h1>
        <p className="text-sm text-hajr-muted">{t("subtitle")}</p>
      </div>
      <FeedbackClient />
    </div>
  );
}
