import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { ContactsClient } from "./contacts-client";

export const dynamic = "force-dynamic";

/** /admin/communications/contacts — visitor contact request manager. */
export default async function AdminContactsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("AdminComms");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-hajr-navy">{t("contactsTitle")}</h1>
        <p className="text-sm text-hajr-muted">{t("contactsSubtitle")}</p>
      </div>
      <ContactsClient />
    </div>
  );
}
