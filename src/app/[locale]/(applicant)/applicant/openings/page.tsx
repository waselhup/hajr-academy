import { getTranslations } from "next-intl/server";
import { Megaphone, Inbox, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireApplicantFeature } from "@/lib/applicants/guard";
import { canApplicantSeeOpening } from "@/lib/applicants/service";
import { programName } from "@/lib/openings/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplyInterestButton } from "@/components/applicant/apply-button";

export const dynamic = "force-dynamic";

export default async function ApplicantOpeningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { applicant } = await requireApplicantFeature("OPENINGS");
  const t = await getTranslations("Applicant");
  const isAr = locale === "ar";

  let loadError = false;
  let visible: Awaited<ReturnType<typeof loadVisible>> = [];

  async function loadVisible() {
    const openings = await prisma.programOpening.findMany({
      where: { status: "OPEN" },
      include: { program: true },
      orderBy: { openedAt: "desc" },
    });
    // SINGLE visibility guard — canApplicantSeeOpening (extended by later prompt).
    const allowed = [];
    for (const o of openings) {
      const ok = await canApplicantSeeOpening(
        { id: applicant.id, gender: applicant.gender },
        { status: o.status, program: { active: o.program.active } }
      );
      if (ok) allowed.push(o);
    }
    return allowed;
  }

  try {
    visible = await loadVisible();
  } catch (e) {
    console.error("[applicant/openings] load failed:", e);
    loadError = true;
  }

  const appliedId = applicant.appliedProgram?.id ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-5" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-hajr-deep-navy">
          <Megaphone className="h-6 w-6 text-hajr-rose" />
          {t("openingsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("openingsSubtitle")}</p>
      </header>

      {loadError ? (
        <Card className="border-hajr-error/30 bg-hajr-error/5">
          <CardContent className="p-6 text-sm text-hajr-error">{t("openingsError")}</CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 text-hajr-gray-300" />
            {t("openingsEmpty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((o) => {
            const applied = appliedId === o.programId;
            return (
              <Card key={o.id} className="flex flex-col">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-base text-hajr-deep-navy">
                    {programName(o.program, locale)}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {isAr ? o.program.descriptionAr : o.program.descriptionEn}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  {applied ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("interestRecorded")}
                    </Badge>
                  ) : (
                    <ApplyInterestButton programId={o.programId} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
