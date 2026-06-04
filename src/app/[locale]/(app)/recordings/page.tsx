import { getTranslations } from "next-intl/server";
import { Video } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { MyRecordingsClient } from "./recordings-client";

export const dynamic = "force-dynamic";

/**
 * /recordings — a user's personal targeted-recordings library (C7).
 *
 * Any authenticated role can open this page; the list itself is scoped
 * server-side to recordings the user is an explicit viewer of (see
 * GET /api/recordings/targeted). Empty for users who have none shared with them.
 */
export default async function MyRecordingsPage() {
  await requireSession();
  const t = await getTranslations("TargetedRecordings");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold text-hajr-navy">{t("mineTitle")}</h1>
      </div>
      <p className="text-sm text-hajr-muted">{t("mineSubtitle")}</p>
      <MyRecordingsClient />
    </div>
  );
}
