import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminRecordingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();

  let rows: any[] = [];

  try {
    rows = await prisma.classSession.findMany({
      where: { zoomRecordingUrl: { not: null } },
      include: {
        class: {
          include: { teacher: { include: { user: { select: { name: true, nameAr: true } } } } },
        },
      },
      orderBy: { scheduledDate: "desc" },
      take: 100,
    });
  } catch (e) {
    console.error("[admin-recordings] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold">{t("Video.recordings")}</h1>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <Video className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-muted-foreground">{t("Video.noRecordings")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Video.date")}</TableHead>
                  <TableHead>{t("Nav.classes")}</TableHead>
                  <TableHead>{t("Nav.teachers")}</TableHead>
                  <TableHead>{t("Video.duration")}</TableHead>
                  <TableHead className="text-end">{t("Common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => {
                  const dur =
                    r.startedAt && r.endedAt
                      ? Math.round((r.endedAt.getTime() - r.startedAt.getTime()) / 60_000)
                      : r.class.durationMinutes;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="num">
                        {r.scheduledDate.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")}
                      </TableCell>
                      <TableCell>{r.class.nameAr ?? r.class.name}</TableCell>
                      <TableCell>{r.class.teacher.user.nameAr ?? r.class.teacher.user.name}</TableCell>
                      <TableCell className="num">{dur}m</TableCell>
                      <TableCell className="text-end">
                        <a
                          href={r.zoomRecordingUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-brand-navy px-3 py-1.5 text-xs text-white"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {t("Video.watchRecording")}
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
