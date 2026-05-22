import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { ChatsClient } from "./chats-client";

export const dynamic = "force-dynamic";

/** /admin/communications/chats — read-only browser of all conversations. */
export default async function AdminChatsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("AdminComms");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-hajr-navy">{t("chatsTitle")}</h1>
        <p className="text-sm text-hajr-muted">{t("chatsSubtitle")}</p>
      </div>
      <ChatsClient />
    </div>
  );
}
