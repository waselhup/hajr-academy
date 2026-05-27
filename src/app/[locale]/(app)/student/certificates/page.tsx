import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, ExternalLink, Share2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentCertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Certificates");
  const isAr = locale === "ar";

  const sp = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const certs = sp
    ? await prisma.certificate.findMany({
        where: { studentId: sp.id, revoked: false },
        orderBy: { issueDate: "desc" },
      })
    : [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="text-2xl font-bold text-hajr-deep-navy flex items-center gap-2">
          <Award className="h-7 w-7 text-hajr-rose" />
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? "كل الشهادات التي حصلت عليها — قابلة للتحقق عبر QR"
            : "All your earned certificates — QR-verifiable"}
        </p>
      </header>

      {certs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Award className="mx-auto h-12 w-12 mb-3 opacity-50" />
            {isAr
              ? "لا توجد شهادات بعد. أكمل المستويات لتحصل على شهادتك الأولى."
              : "No certificates yet. Complete a level to earn your first."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map((c) => {
            const verifyUrl = `/${locale}/verify/${c.verificationCode}`;
            const shareText = encodeURIComponent(
              isAr
                ? `حصلت على ${c.titleAr} من أكاديمية هجر!`
                : `I earned ${c.titleEn} from HAJR Academy!`
            );
            const fullVerify = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${verifyUrl}`;
            return (
              <Card key={c.id} className="border-hajr-border">
                <CardContent className="p-4 space-y-3">
                  {c.qrCodeUrl ? (
                    <img
                      src={c.qrCodeUrl}
                      alt="Certificate QR"
                      className="w-24 h-24 mx-auto"
                    />
                  ) : null}
                  <h3 className="font-semibold text-hajr-deep-navy text-center">
                    {isAr ? c.titleAr : c.titleEn}
                  </h3>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Badge variant="outline">{c.type}</Badge>
                    {c.cefrLevel ? <Badge>{c.cefrLevel}</Badge> : null}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {t("issuedOn")}: {c.issueDate.toISOString().slice(0, 10)}
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    Code: <span className="font-mono">{c.verificationCode}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hajr-border">
                    <Button asChild size="sm" variant="outline" className="min-h-[44px]">
                      <a href={c.pdfUrl} target="_blank" rel="noopener">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="bg-hajr-rose text-white min-h-[44px]"
                    >
                      <a
                        href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(fullVerify)}`}
                        target="_blank"
                        rel="noopener"
                      >
                        <Share2 className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="min-h-[44px]">
                      <a href={verifyUrl} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
