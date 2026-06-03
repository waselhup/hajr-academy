import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminRatingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Ratings");

  let teachers: Array<{
    teacherId: string;
    teacherName: string;
    postAvg: number | null;
    postCount: number;
    monthlyAvg: number | null;
    parentMonthlyAvg: number | null;
  }> = [];
  let recent: Array<{
    id: string;
    teacherName: string;
    raterName: string;
    rating: number;
    kind: string;
    comment: string | null;
    studentNoteForParent: string | null;
    createdAt: Date;
  }> = [];

  try {
    const ratings = await prisma.teacherRating.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        teacher: { include: { user: { select: { name: true, nameAr: true } } } },
        rater: { select: { name: true, nameAr: true } },
      },
    });
    recent = ratings.map((r) => ({
      id: r.id,
      teacherName: r.teacher.user.nameAr || r.teacher.user.name,
      raterName: r.rater.nameAr || r.rater.name,
      rating: r.rating,
      kind: r.kind,
      comment: r.comment,
      studentNoteForParent: r.studentNoteForParent,
      createdAt: r.createdAt,
    }));

    // Per-teacher aggregates
    const teacherProfiles = await prisma.teacherProfile.findMany({
      include: { user: { select: { name: true, nameAr: true } } },
      take: 100,
    });
    teachers = await Promise.all(
      teacherProfiles.map(async (tp) => {
        const [postAgg, monthlyAgg, parentMonthlyAgg] = await Promise.all([
          prisma.teacherRating.aggregate({
            where: { teacherId: tp.id, isApproved: true, kind: "POST_SESSION" },
            _avg: { rating: true },
            _count: { _all: true },
          }),
          prisma.teacherRating.aggregate({
            where: { teacherId: tp.id, isApproved: true, kind: "MONTHLY" },
            _avg: { rating: true },
          }),
          prisma.teacherRating.aggregate({
            where: { teacherId: tp.id, isApproved: true, kind: "PARENT_MONTHLY", rating: { gt: 0 } },
            _avg: { rating: true },
          }),
        ]);
        return {
          teacherId: tp.id,
          teacherName: tp.user.nameAr || tp.user.name,
          postAvg: postAgg._avg.rating ? Number(postAgg._avg.rating.toFixed(2)) : null,
          postCount: postAgg._count._all,
          monthlyAvg: monthlyAgg._avg.rating ? Number(monthlyAgg._avg.rating.toFixed(2)) : null,
          parentMonthlyAvg: parentMonthlyAgg._avg.rating
            ? Number(parentMonthlyAgg._avg.rating.toFixed(2))
            : null,
        };
      })
    );
    teachers.sort((a, b) => (b.postAvg ?? 0) - (a.postAvg ?? 0));
  } catch (e) {
    console.error("[admin/ratings]", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("adminTitle")}</h1>
        <p className="text-sm text-hajr-gray-500">{t("adminSubtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                <tr>
                  <th className="px-3 py-2 text-start">{t("colTeacher")}</th>
                  <th className="px-3 py-2 text-start">{t("colPostAvg")}</th>
                  <th className="px-3 py-2 text-start">{t("colPostCount")}</th>
                  <th className="px-3 py-2 text-start">{t("colMonthlyAvg")}</th>
                  <th className="px-3 py-2 text-start">{t("colParentAvg")}</th>
                </tr>
              </thead>
              <tbody>
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-hajr-gray-500">
                      {t("emptyTeachers")}
                    </td>
                  </tr>
                ) : (
                  teachers.map((tr) => (
                    <tr key={tr.teacherId} className="border-t border-hajr-gray-100">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/ratings/teachers/${tr.teacherId}`}
                          className="font-medium text-hajr-rose hover:underline"
                        >
                          {tr.teacherName}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400" />
                          {tr.postAvg ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{tr.postCount}</td>
                      <td className="px-3 py-2">{tr.monthlyAvg ?? "—"}</td>
                      <td className="px-3 py-2">{tr.parentMonthlyAvg ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-sm font-semibold">{t("recentComments")}</div>
          {recent.length === 0 ? (
            <div className="text-center text-hajr-gray-500">{t("emptyComments")}</div>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={r.id} className="border-b border-hajr-gray-100 pb-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.teacherName}</div>
                    <div className="flex items-center gap-2 text-xs text-hajr-gray-500">
                      <Badge variant="outline">{r.kind}</Badge>
                      <span>★ {r.rating}</span>
                      <span>{r.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-xs text-hajr-gray-500">{r.raterName}</div>
                  {(r.comment || r.studentNoteForParent) && (
                    <div className="mt-1 text-xs">
                      {r.comment && <p>{r.comment}</p>}
                      {r.studentNoteForParent && (
                        <p className="italic text-hajr-rose">↳ {r.studentNoteForParent}</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
