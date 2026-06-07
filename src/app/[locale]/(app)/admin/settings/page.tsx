import { requireRole } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { PlaceholderPage } from "@/components/common/placeholder-page";
import { AvatarUpload } from "@/components/shared/AvatarUpload";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // Both admin tiers can manage their own account here. (SUPER_ADMIN-only
  // would bounce a plain ADMIN — see the RBAC dual-role rule.)
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, nameAr: true, email: true, avatar: true },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold text-hajr-text">{t("Avatar.photo")}</h2>
        <AvatarUpload
          name={(me?.name ?? session.user.name ?? me?.email) || "?"}
          initialAvatar={me?.avatar ?? null}
        />
      </section>

      <PlaceholderPage
        title={t("Nav.settings")}
        phase={2}
        description="System config — VAT rate, business hours, keyword filter."
      />
    </div>
  );
}
