import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LibraryItemViewer } from "./_components/library-item-viewer";

export const dynamic = "force-dynamic";

export default async function StudentLibraryItemPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Library");

  let item: Awaited<ReturnType<typeof prisma.libraryItem.findUnique>> = null;
  let initialProgress = 0;
  try {
    item = await prisma.libraryItem.findUnique({ where: { id } });
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (item && profile) {
      const prog = await prisma.libraryProgress.findUnique({
        where: {
          studentId_libraryItemId: {
            studentId: profile.id,
            libraryItemId: id,
          },
        },
      });
      initialProgress = prog?.progressPct ?? 0;
    }
  } catch (e) {
    console.error("[student/library/[id]]", e);
  }

  if (!item || !item.isPublished) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("itemUnavailable")}</h1>
        <Button asChild variant="outline">
          <Link href={`/${locale}/student/library`}>{t("backToLibrary")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">
            {locale === "ar" ? item.titleAr || item.title : item.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge>{item.type}</Badge>
            <Badge variant="outline">{item.skillLevel}</Badge>
            <Badge variant="outline">{item.targetAgeTier}</Badge>
            <Badge variant="info">
              {item.durationMinutes} {t("minutes")}
            </Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/student/library`}>{t("backToLibrary")}</Link>
        </Button>
      </div>

      {(item.description || item.descriptionAr) && (
        <Card>
          <CardContent className="p-4 text-sm text-hajr-gray-600">
            {locale === "ar" ? item.descriptionAr || item.description : item.description}
          </CardContent>
        </Card>
      )}

      <LibraryItemViewer
        item={{
          id: item.id,
          type: item.type,
          contentUrl: item.contentUrl,
          contentHtml: item.contentHtml,
          exerciseData: item.exerciseData as unknown,
        }}
        initialProgress={initialProgress}
      />
    </div>
  );
}
