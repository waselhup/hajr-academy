import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { LibraryItemForm } from "../../../admin/library/_components/library-item-form";

export const dynamic = "force-dynamic";

export default async function NewTeacherLibraryItemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("TEACHER");
  const t = await getTranslations("Library");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("newItemTitle")}</h1>
        <p className="text-sm text-hajr-gray-500">{t("teacherUploadHelp")}</p>
      </div>
      <LibraryItemForm
        locale={locale}
        mode="create"
        returnTo={`/${locale}/teacher/library`}
      />
    </div>
  );
}
