import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LibraryItemForm } from "../_components/library-item-form";
import { LibraryDeleteButton } from "../_components/library-delete-button";

export const dynamic = "force-dynamic";

export default async function AdminLibraryEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Library");

  let item: Awaited<ReturnType<typeof prisma.libraryItem.findUnique>> = null;
  let progressCount = 0;
  let completionCount = 0;
  let avgTime = 0;
  try {
    item = await prisma.libraryItem.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (item) {
      const [total, completed, agg] = await Promise.all([
        prisma.libraryProgress.count({ where: { libraryItemId: id } }),
        prisma.libraryProgress.count({
          where: { libraryItemId: id, status: "COMPLETED" },
        }),
        prisma.libraryProgress.aggregate({
          _avg: { timeSpentSec: true },
          where: { libraryItemId: id },
        }),
      ]);
      progressCount = total;
      completionCount = completed;
      avgTime = Math.round(agg._avg.timeSpentSec ?? 0);
    }
  } catch (e) {
    console.error("[admin/library/[id]]", e);
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("notFound")}</h1>
        <Button asChild variant="outline">
          <Link href="/admin/library">{t("backToList")}</Link>
        </Button>
      </div>
    );
  }

  const completionPct = progressCount ? Math.round((completionCount / progressCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("editItem")}</h1>
          <p className="text-sm text-hajr-gray-500">{item.titleAr || item.title}</p>
        </div>
        <LibraryDeleteButton id={item.id} locale={locale} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("views")}</div>
            <div className="text-2xl font-bold">{item.viewCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("studentsStarted")}</div>
            <div className="text-2xl font-bold">{progressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("completionRate")}</div>
            <div className="text-2xl font-bold text-hajr-mint">{completionPct}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("avgTimeSec")}</div>
            <div className="text-2xl font-bold">{avgTime}s</div>
          </CardContent>
        </Card>
      </div>

      <LibraryItemForm
        locale={locale}
        mode="edit"
        initial={item}
        returnTo={`/${locale}/admin/library`}
      />
    </div>
  );
}
