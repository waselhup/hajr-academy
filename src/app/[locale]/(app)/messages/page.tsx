import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/rbac";
import { MessagesClient } from "./messages-client";

export const dynamic = "force-dynamic";

/** /messages — the messaging inbox (all roles). */
export default async function MessagesPage() {
  const session = await requireSession();
  const t = await getTranslations("Messages");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <MessagesClient
        currentUserId={session.user.id}
        currentRole={session.user.role}
      />
    </div>
  );
}
