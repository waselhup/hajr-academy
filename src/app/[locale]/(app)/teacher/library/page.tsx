import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { TeacherLibraryTabs } from "./_components/teacher-library-tabs";

export const dynamic = "force-dynamic";

export default async function TeacherLibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations("Library");

  type Row = Awaited<ReturnType<typeof prisma.libraryItem.findFirstOrThrow>> & {
    tags: { id: string; itemId: string; tag: string }[];
  };
  let mine: Row[] = [];
  let all: Row[] = [];
  try {
    [mine, all] = await Promise.all([
      prisma.libraryItem.findMany({
        where: { authorId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { tags: true },
        take: 100,
      }),
      prisma.libraryItem.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        include: { tags: true },
        take: 200,
      }),
    ]);
  } catch (e) {
    console.error("[teacher/library]", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("teacherTitle")}</h1>
          <p className="text-sm text-hajr-gray-500">{t("teacherSubtitle")}</p>
        </div>
        <Button asChild className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
          <Link href={`/${locale}/teacher/library/new`}>{t("uploadNew")}</Link>
        </Button>
      </div>

      <TeacherLibraryTabs locale={locale} mine={mine} all={all} />
    </div>
  );
}
