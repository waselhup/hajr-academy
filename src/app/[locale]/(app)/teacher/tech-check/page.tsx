import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { getLastTechCheckSummary } from "@/lib/teacher/tech-check-gate";
import { TechCheckWizard } from "./_components/tech-check-wizard";

export const dynamic = "force-dynamic";

export default async function TeacherTechCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const t = await getTranslations("TechCheck");
  const last = await getLastTechCheckSummary(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("title")}</h1>
        <p className="text-sm text-hajr-gray-500">{t("subtitle")}</p>
      </div>

      <TechCheckWizard returnTo={sp.return ?? null} lastSummary={last} />
    </div>
  );
}
