import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminTechChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string; status?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const t = await getTranslations("TechCheck");

  let rows: Array<{
    id: string;
    teacherId: string;
    teacherName: string;
    passed: boolean;
    score: number;
    downloadMbps: number;
    uploadMbps: number;
    latencyMs: number;
    audioPeakDb: number;
    failureReasons: string[];
    createdAt: Date;
  }> = [];
  let stats = { total: 0, passed: 0, failed: 0, last7Days: 0 };

  try {
    const where = {
      ...(sp.teacher ? { teacherId: sp.teacher } : {}),
      ...(sp.status === "passed" ? { passed: true } : {}),
      ...(sp.status === "failed" ? { passed: false } : {}),
    };
    const [list, total, passed, last7Days] = await Promise.all([
      prisma.techCheck.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.techCheck.count(),
      prisma.techCheck.count({ where: { passed: true } }),
      prisma.techCheck.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
      }),
    ]);

    const teacherIds = Array.from(new Set(list.map((r) => r.teacherId)));
    const users = await prisma.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, name: true, nameAr: true },
    });
    const nameMap = new Map(users.map((u) => [u.id, u.nameAr || u.name]));

    rows = list.map((r) => ({
      id: r.id,
      teacherId: r.teacherId,
      teacherName: nameMap.get(r.teacherId) ?? r.teacherId.slice(0, 8),
      passed: r.passed,
      score: r.score,
      downloadMbps: Number(r.downloadMbps),
      uploadMbps: Number(r.uploadMbps),
      latencyMs: r.latencyMs,
      audioPeakDb: Number(r.audioPeakDb),
      failureReasons: r.failureReasons,
      createdAt: r.createdAt,
    }));
    stats = { total, passed, failed: total - passed, last7Days };
  } catch (e) {
    console.error("[admin/tech-checks]", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("adminLogTitle")}</h1>
        <p className="text-sm text-hajr-gray-500">{t("adminLogSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("colTotal")}</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("colPassed")}</div>
            <div className="text-2xl font-bold text-hajr-mint">{stats.passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("colFailed")}</div>
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("colLast7")}</div>
            <div className="text-2xl font-bold">{stats.last7Days}</div>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-hajr-gray-500">
            {t("emptyLog")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-start">{t("colTeacher")}</th>
                    <th className="px-3 py-2 text-start">{t("colWhen")}</th>
                    <th className="px-3 py-2 text-start">{t("colResult")}</th>
                    <th className="px-3 py-2 text-start">{t("colScore")}</th>
                    <th className="px-3 py-2 text-start">{t("colDl")}</th>
                    <th className="px-3 py-2 text-start">{t("colUp")}</th>
                    <th className="px-3 py-2 text-start">{t("colLatency")}</th>
                    <th className="px-3 py-2 text-start">{t("colAudio")}</th>
                    <th className="px-3 py-2 text-start">{t("colFailures")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-hajr-gray-100">
                      <td className="px-3 py-2 font-medium">{r.teacherName}</td>
                      <td className="px-3 py-2 text-hajr-gray-500">
                        {r.createdAt.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={r.passed ? "success" : "danger"}>
                          {r.passed ? t("passed") : t("failed")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{r.score}</td>
                      <td className="px-3 py-2">{r.downloadMbps} Mbps</td>
                      <td className="px-3 py-2">{r.uploadMbps} Mbps</td>
                      <td className="px-3 py-2">{r.latencyMs} ms</td>
                      <td className="px-3 py-2">{r.audioPeakDb} dB</td>
                      <td className="px-3 py-2 text-xs text-hajr-gray-500">
                        {r.failureReasons.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
