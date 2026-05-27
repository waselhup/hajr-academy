import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Award, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const isAr = locale === "ar";

  const cert = await prisma.certificate.findUnique({
    where: { verificationCode: code },
    include: {
      student: { include: { user: { select: { name: true, nameAr: true } } } },
    },
  });

  const found = !!cert;
  const valid = found && !cert.revoked;

  return (
    <div
      className="min-h-screen bg-hajr-ivory py-12 px-4"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center">
          <Link
            href={`/${locale}`}
            className="inline-block text-hajr-deep-navy font-bold text-2xl tracking-wider"
          >
            HAJR<sup className="text-hajr-rose text-base">A°</sup>
          </Link>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">
            Certificate Verification · التحقق من الشهادة
          </p>
        </header>

        {!found ? (
          <Card className="border-hajr-error">
            <CardContent className="p-8 text-center space-y-4">
              <ShieldAlert className="h-16 w-16 text-hajr-error mx-auto" />
              <h1 className="text-2xl font-bold text-hajr-error">
                {isAr ? "شهادة غير موجودة" : "Certificate not found"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? `لا توجد شهادة بهذا الرمز: ${code}`
                  : `No certificate with code: ${code}`}
              </p>
            </CardContent>
          </Card>
        ) : !valid ? (
          <Card className="border-hajr-error">
            <CardContent className="p-8 text-center space-y-4">
              <ShieldAlert className="h-16 w-16 text-hajr-error mx-auto" />
              <h1 className="text-2xl font-bold text-hajr-error">
                {isAr ? "شهادة مسحوبة" : "Certificate revoked"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "تم سحب هذه الشهادة ولم تعد سارية."
                  : "This certificate has been revoked and is no longer valid."}
              </p>
              {cert.revokedReason ? (
                <p className="text-sm">
                  <strong>{isAr ? "السبب:" : "Reason:"}</strong> {cert.revokedReason}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-hajr-success border-2">
            <div className="bg-hajr-deep-navy text-white p-8 text-center">
              <ShieldCheck className="h-16 w-16 mx-auto mb-3" style={{ color: "#B5E5D8" }} />
              <h1 className="text-3xl font-bold">
                {isAr ? "شهادة موثّقة" : "Verified Certificate"}
              </h1>
              <p className="text-sm opacity-80 mt-2">
                {isAr
                  ? "هذه الشهادة صادرة عن أكاديمية هجر وسارية المفعول"
                  : "This certificate was issued by HAJR Academy and is currently valid"}
              </p>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="text-center pb-4 border-b border-hajr-border">
                <Award className="h-10 w-10 text-hajr-rose mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-hajr-deep-navy">
                  {isAr ? cert.titleAr : cert.titleEn}
                </h2>
                {(isAr ? cert.descriptionAr : cert.descriptionEn) ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    {isAr ? cert.descriptionAr : cert.descriptionEn}
                  </p>
                ) : null}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-hajr-rose font-semibold uppercase">
                    {isAr ? "الطالب" : "Student"}
                  </div>
                  <div className="font-semibold text-hajr-deep-navy">
                    {isAr
                      ? cert.student.user.nameAr || cert.student.user.name
                      : cert.student.user.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-hajr-rose font-semibold uppercase">
                    {isAr ? "النوع" : "Type"}
                  </div>
                  <Badge variant="outline">{cert.type}</Badge>
                </div>
                <div>
                  <div className="text-xs text-hajr-rose font-semibold uppercase">
                    {isAr ? "تاريخ الإصدار" : "Issued on"}
                  </div>
                  <div className="font-mono">{cert.issueDate.toISOString().slice(0, 10)}</div>
                </div>
                {cert.expiryDate ? (
                  <div>
                    <div className="text-xs text-hajr-rose font-semibold uppercase">
                      {isAr ? "صالحة حتى" : "Valid until"}
                    </div>
                    <div className="font-mono">
                      {cert.expiryDate.toISOString().slice(0, 10)}
                    </div>
                  </div>
                ) : null}
                {cert.cefrLevel ? (
                  <div>
                    <div className="text-xs text-hajr-rose font-semibold uppercase">
                      {isAr ? "المستوى" : "Level"}
                    </div>
                    <Badge className="bg-hajr-navy text-white">{cert.cefrLevel}</Badge>
                  </div>
                ) : null}
                {cert.score != null ? (
                  <div>
                    <div className="text-xs text-hajr-rose font-semibold uppercase">
                      {isAr ? "النتيجة" : "Score"}
                    </div>
                    <div className="font-bold">{cert.score}/100</div>
                  </div>
                ) : null}
              </div>

              <div className="pt-4 border-t border-hajr-border text-center">
                <div className="text-xs text-muted-foreground mb-2">
                  {isAr ? "رمز التحقق" : "Verification code"}
                </div>
                <div className="font-mono text-sm bg-hajr-ivory inline-block px-3 py-1 rounded">
                  {cert.verificationCode}
                </div>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <Button asChild className="bg-hajr-rose text-white min-h-[44px]">
                  <a href={cert.pdfUrl} target="_blank" rel="noopener">
                    <Download className="h-4 w-4 me-1" />
                    {isAr ? "تنزيل الشهادة" : "Download certificate"}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground">
          <p>
            {isAr ? "أصدرت بواسطة" : "Issued by"}{" "}
            <Link href={`/${locale}`} className="text-hajr-rose font-semibold">
              HAJR A° English Academy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
