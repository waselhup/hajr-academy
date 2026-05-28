import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LibraryAdminGrid } from "./_components/library-admin-grid";

export const dynamic = "force-dynamic";

export default async function AdminLibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Library");

  let items: Array<
    Awaited<ReturnType<typeof prisma.libraryItem.findFirstOrThrow>> & {
      tags: { id: string; itemId: string; tag: string }[];
    }
  > = [];
  let stats = { total: 0, published: 0, totalViews: 0 };
  try {
    const [rows, total, published, agg] = await Promise.all([
      prisma.libraryItem.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { tags: true },
      }),
      prisma.libraryItem.count(),
      prisma.libraryItem.count({ where: { isPublished: true } }),
      prisma.libraryItem.aggregate({ _sum: { viewCount: true } }),
    ]);
    items = rows;
    stats = { total, published, totalViews: agg._sum.viewCount ?? 0 };
  } catch (e) {
    console.error("[admin/library]", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("adminTitle")}</h1>
          <p className="text-sm text-hajr-gray-500">{t("adminSubtitle")}</p>
        </div>
        <Button asChild className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
          <Link href={`/${locale}/admin/library/new`} data-testid="library-new-btn">
            {t("uploadNew")}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("totalItems")}</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("publishedItems")}</div>
            <div className="text-2xl font-bold text-hajr-mint">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("totalViews")}</div>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>
      </div>

      <LibraryAdminGrid locale={locale} items={items} />
    </div>
  );
}
