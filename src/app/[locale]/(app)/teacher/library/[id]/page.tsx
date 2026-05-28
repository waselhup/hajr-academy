import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LibraryItemForm } from "../../../admin/library/_components/library-item-form";

export const dynamic = "force-dynamic";

export default async function TeacherLibraryEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations("Library");

  let item: Awaited<ReturnType<typeof prisma.libraryItem.findUnique>> = null;
  try {
    item = await prisma.libraryItem.findUnique({
      where: { id },
      include: { tags: true },
    });
  } catch (e) {
    console.error("[teacher/library/[id]]", e);
  }

  if (!item || item.authorId !== session.user.id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("notYourItem")}</h1>
        <Button asChild variant="outline">
          <Link href={`/${locale}/teacher/library`}>{t("backToList")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("editItem")}</h1>
      <LibraryItemForm
        locale={locale}
        mode="edit"
        initial={item}
        returnTo={`/${locale}/teacher/library`}
      />
    </div>
  );
}
