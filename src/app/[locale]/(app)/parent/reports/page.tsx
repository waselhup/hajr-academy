import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getParentProfileId } from "@/lib/parent/children";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share2, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTH_AR: Record<number, string> = {
  1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
  5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
  9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر",
};
const MONTH_EN: Record<number, string> = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December",
};

export default async function ParentReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations("Reports");
  const isAr = locale === "ar";

  const parentId = await getParentProfileId(session.user.id);
  const links = parentId
    ? await prisma.parentStudentLink.findMany({
        where: { parentId },
        select: { studentId: true },
      })
    : [];
  const studentIds = links.map((l) => l.studentId);

  const reports = studentIds.length
    ? await prisma.parentReport.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
        include: {
          student: {
            include: { user: { select: { name: true, nameAr: true } } },
          },
        },
      })
    : [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "تقارير شهرية تفصيلية عن تقدم أبنائك"
              : "Monthly progress reports for your children"}
          </p>
        </div>
      </header>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
            {isAr
              ? "لا توجد تقارير بعد. سيتم إرسال أول تقرير في بداية الشهر القادم."
              : "No reports yet. The first report will be sent at the start of next month."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const rate = Number(r.attendanceRate);
            const name = isAr
              ? r.student.user.nameAr || r.student.user.name
              : r.student.user.name;
            return (
              <Link key={r.id} href={`/${locale}/parent/reports/${r.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow border-hajr-border min-h-[44px]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-hajr-rose text-white">
                        {isAr ? MONTH_AR[r.month] : MONTH_EN[r.month]} {r.year}
                      </Badge>
                      <Badge variant="outline">
                        {rate.toFixed(0)}% {t("attendanceRate")}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-hajr-deep-navy">{name}</h3>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="font-bold text-hajr-navy">{r.lessonsCompleted}</div>
                        <div className="text-muted-foreground">{t("lessonsCompleted")}</div>
                      </div>
                      <div>
                        <div className="font-bold text-hajr-navy">
                          {r.homeworkCompleted}/{r.homeworkTotal}
                        </div>
                        <div className="text-muted-foreground">{t("homeworkStatus")}</div>
                      </div>
                      <div>
                        <div className="font-bold text-hajr-navy">
                          {r.levelAfter || "—"}
                        </div>
                        <div className="text-muted-foreground">{t("levelAfter")}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-hajr-border">
                      {r.pdfUrl ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[44px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a href={r.pdfUrl} target="_blank" rel="noopener">
                            <Download className="h-4 w-4 me-1" />
                            {t("downloadPdf")}
                          </a>
                        </Button>
                      ) : null}
                      {r.shareImageUrl ? (
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 bg-hajr-rose text-white min-h-[44px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a href={r.shareImageUrl} target="_blank" rel="noopener">
                            <Share2 className="h-4 w-4 me-1" />
                            {t("shareImage")}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
