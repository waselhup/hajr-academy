import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminRatingTeacherDrilldown({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Ratings");

  let teacher: { id: string; name: string } | null = null;
  let ratings: Array<{
    id: string;
    rating: number;
    kind: string;
    raterName: string;
    raterRole: string;
    comment: string | null;
    studentNoteForParent: string | null;
    improved: string | null;
    createdAt: Date;
  }> = [];

  try {
    const tp = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: { select: { name: true, nameAr: true } } },
    });
    if (tp) {
      teacher = { id: tp.id, name: tp.user.nameAr || tp.user.name };
      const rs = await prisma.teacherRating.findMany({
        where: { teacherId: id },
        orderBy: { createdAt: "desc" },
        include: { rater: { select: { name: true, nameAr: true } } },
        take: 200,
      });
      ratings = rs.map((r) => ({
        id: r.id,
        rating: r.rating,
        kind: r.kind,
        raterName: r.rater.nameAr || r.rater.name,
        raterRole: r.raterRole,
        comment: r.comment,
        studentNoteForParent: r.studentNoteForParent,
        improved: r.improved,
        createdAt: r.createdAt,
      }));
    }
  } catch (e) {
    console.error("[admin/ratings/teachers]", e);
  }

  if (!teacher) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("teacherNotFound")}</h1>
        <Button asChild variant="outline">
          <Link href={`/${locale}/admin/ratings`}>{t("backToRatings")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">{teacher.name}</h1>
          <p className="text-sm text-hajr-gray-500">{t("teacherDrillSubtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/admin/ratings`}>{t("backToRatings")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                <tr>
                  <th className="px-3 py-2 text-start">{t("colRater")}</th>
                  <th className="px-3 py-2 text-start">{t("colKind")}</th>
                  <th className="px-3 py-2 text-start">{t("colRating")}</th>
                  <th className="px-3 py-2 text-start">{t("colImproved")}</th>
                  <th className="px-3 py-2 text-start">{t("colComment")}</th>
                  <th className="px-3 py-2 text-start">{t("colWhen")}</th>
                </tr>
              </thead>
              <tbody>
                {ratings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-hajr-gray-500">
                      {t("emptyComments")}
                    </td>
                  </tr>
                ) : (
                  ratings.map((r) => (
                    <tr key={r.id} className="border-t border-hajr-gray-100">
                      <td className="px-3 py-2 font-medium">{r.raterName}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{r.kind}</Badge>
                      </td>
                      <td className="px-3 py-2">★ {r.rating}</td>
                      <td className="px-3 py-2 text-hajr-gray-500">{r.improved ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-hajr-gray-600">
                        {r.comment}
                        {r.studentNoteForParent && (
                          <div className="italic text-hajr-rose">↳ {r.studentNoteForParent}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-hajr-gray-500">
                        {r.createdAt.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
