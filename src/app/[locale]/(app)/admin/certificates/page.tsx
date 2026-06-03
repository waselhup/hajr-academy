import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueForm } from "./_components/issue-form";
import { RevokeButton } from "./_components/revoke-button";
import { Award, Download, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Certificates");
  const isAr = locale === "ar";

  const [students, certs] = await Promise.all([
    prisma.studentProfile.findMany({
      include: { user: { select: { id: true, name: true, nameAr: true } } },
      orderBy: { user: { name: "asc" } },
      take: 500,
    }),
    prisma.certificate.findMany({
      include: {
        student: { include: { user: { select: { name: true, nameAr: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="text-2xl font-bold text-hajr-deep-navy flex items-center gap-2">
          <Award className="h-7 w-7 text-hajr-rose" />
          {t("pageTitle")}
        </h1>
      </header>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-hajr-deep-navy mb-3">{t("issueCertificate")}</h2>
          <IssueForm
            students={students.map((s) => ({
              id: s.id,
              name: isAr ? s.user.nameAr || s.user.name : s.user.name,
            }))}
            locale={locale}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-hajr-deep-navy">
            {isAr ? "آخر الشهادات" : "Recent certificates"}
          </h2>
          {certs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {isAr ? "لا توجد شهادات بعد" : "No certificates yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {certs.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border border-hajr-border rounded-md gap-3 flex-wrap min-h-[44px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-hajr-deep-navy">
                      {isAr ? c.titleAr : c.titleEn}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isAr
                        ? c.student.user.nameAr || c.student.user.name
                        : c.student.user.name}{" "}
                      · {c.verificationCode}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{c.type}</Badge>
                    {c.revoked ? (
                      <Badge className="bg-hajr-error text-white">{t("revoked")}</Badge>
                    ) : (
                      <Badge className="bg-hajr-success text-white">{t("verified")}</Badge>
                    )}
                    <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                      <a href={c.pdfUrl} target="_blank" rel="noopener">
                        <Download className="h-4 w-4 me-1" />
                        PDF
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                      <a href={`/${locale}/verify/${c.verificationCode}`} target="_blank">
                        <ExternalLink className="h-4 w-4 me-1" />
                        {t("verifyOnline")}
                      </a>
                    </Button>
                    {!c.revoked ? (
                      <RevokeButton certId={c.id} locale={locale} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
