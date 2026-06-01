import { getTranslations } from "next-intl/server";
import { Video } from "lucide-react";
import { requireApplicantFeature } from "@/lib/applicants/guard";
import { Card, CardContent } from "@/components/ui/card";
import { DemoSubmit } from "@/components/applicant/demo-upload";

export const dynamic = "force-dynamic";

/**
 * Applicant demo lesson — upload a recorded demo (private `applicant-demos`
 * bucket) or submit a link. Gated behind the DEMO_RECORDING feature.
 */
export default async function ApplicantDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireApplicantFeature("DEMO_RECORDING");
  const t = await getTranslations("Applicant");
  const isAr = locale === "ar";

  return (
    <div className="mx-auto max-w-2xl space-y-5" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-hajr-deep-navy">
          <Video className="h-6 w-6 text-hajr-rose" />
          {t("demoTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("demoSubtitle")}</p>
      </header>

      <Card className="border-hajr-mint/40 bg-hajr-mint/5">
        <CardContent className="p-5 text-sm text-hajr-deep-navy">{t("demoIntro")}</CardContent>
      </Card>

      <DemoSubmit />
    </div>
  );
}
