import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { LinkChildClient } from "./link-child-client";

export const dynamic = "force-dynamic";

/** /parent/link — redeem an invite code to link a new child. */
export default async function ParentLinkPage() {
  await requireRole("PARENT");
  const t = await getTranslations("ParentPortal");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">{t("linkChild")}</h1>
      <LinkChildClient />
    </div>
  );
}
