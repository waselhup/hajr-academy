import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getParentProfileId } from "@/lib/parent/children";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share2, RotateCw, ArrowLeft } from "lucide-react";

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

export default async function ParentReportDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations("Reports");
  const isAr = locale === "ar";

  const parentId = await getParentProfileId(session.user.id);
  if (!parentId) notFound();

  const report = await prisma.parentReport.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { name: true, nameAr: true } } } },
    },
  });
  if (!report) notFound();

  // Ownership check
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId: report.studentId } },
  });
  if (!link) notFound();

  const name = isAr
    ? report.student.user.nameAr || report.student.user.name
    : report.student.user.name;

  const monthLabel = isAr ? MONTH_AR[report.month] : MONTH_EN[report.month];
  const rate = Number(report.attendanceRate);
  const avgGrade = report.avgGrade != null ? Number(report.avgGrade) : null;

  const shareText = encodeURIComponent(
    isAr
      ? `تقرير ${name} الشهري في أكاديمية هجر — ${monthLabel} ${report.year}`
      : `${name}'s monthly progress at HAJR Academy — ${monthLabel} ${report.year}`
  );
  const shareUrl =
    report.shareImageUrl || report.pdfUrl || "";
  const whatsappLink = `https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`;
  const twitterLink = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="container mx-auto px-4 py-6 space-y-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button asChild size="sm" variant="ghost" className="mb-2">
            <Link href={`/${locale}/parent/reports`}>
              <ArrowLeft className="h-4 w-4 me-1" />
              {isAr ? "العودة" : "Back"}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">
            {name} — {monthLabel} {report.year}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "تقرير شهري مفصّل" : "Detailed monthly report"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {report.pdfUrl ? (
            <Button asChild variant="outline" className="min-h-[44px]">
              <a href={report.pdfUrl} target="_blank" rel="noopener">
                <Download className="h-4 w-4 me-1" />
                {t("downloadPdf")}
              </a>
            </Button>
          ) : null}
          {shareUrl ? (
            <>
              <Button asChild className="bg-hajr-rose text-white min-h-[44px]">
                <a href={whatsappLink} target="_blank" rel="noopener">
                  <Share2 className="h-4 w-4 me-1" />
                  {t("shareWhatsapp")}
                </a>
              </Button>
              <Button asChild variant="outline" className="min-h-[44px]">
                <a href={twitterLink} target="_blank" rel="noopener">
                  {t("shareTwitter")}
                </a>
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-hajr-navy">{rate.toFixed(0)}%</div>
            <div className="text-xs text-hajr-rose font-semibold mt-1">
              {t("attendanceRate")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {report.sessionsAttended} / {report.sessionsTotal}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-hajr-navy">
              {report.lessonsCompleted}
            </div>
            <div className="text-xs text-hajr-rose font-semibold mt-1">
              {t("lessonsCompleted")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-hajr-navy">
              {report.homeworkCompleted}/{report.homeworkTotal}
            </div>
            <div className="text-xs text-hajr-rose font-semibold mt-1">
              {t("homeworkStatus")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-hajr-navy">
              {avgGrade != null ? avgGrade.toFixed(0) : "—"}
            </div>
            <div className="text-xs text-hajr-rose font-semibold mt-1">
              {isAr ? "المعدل" : "Avg Grade"}
            </div>
          </CardContent>
        </Card>
      </div>

      {report.teacherNotes ? (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-hajr-deep-navy mb-2">
              {t("teacherNotes")}
            </h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {report.teacherNotes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-hajr-deep-navy">
            {isAr ? "تطور المستوى" : "Level Progress"}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-hajr-navy text-white px-3 py-1.5">
              {t("levelBefore")}: {report.levelBefore || "—"}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-hajr-rose text-white px-3 py-1.5">
              {t("levelAfter")}: {report.levelAfter || "—"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {report.recordingUrls.length > 0 ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-hajr-deep-navy">
              {t("recentRecordings")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {report.recordingUrls.map((url, i) => (
                <Button
                  key={i}
                  asChild
                  variant="outline"
                  className="justify-start min-h-[44px]"
                >
                  <a href={url} target="_blank" rel="noopener">
                    ▶ {isAr ? `جلسة ${i + 1}` : `Session ${i + 1}`}
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-hajr-deep-navy">
              {t("paymentStatus")}
            </h2>
            <Badge
              className={
                report.paymentStatus === "PAID"
                  ? "bg-hajr-success text-white mt-2"
                  : report.paymentStatus === "OVERDUE"
                  ? "bg-hajr-error text-white mt-2"
                  : "bg-hajr-warning text-white mt-2"
              }
            >
              {report.paymentStatus}
            </Badge>
          </div>
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link href={`/${locale}/parent/finance`}>
              {isAr ? "تفاصيل المالية" : "Finance details"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
