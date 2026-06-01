import { getTranslations } from "next-intl/server";
import { ClipboardCheck, FileQuestion, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireApplicantFeature } from "@/lib/applicants/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Applicant test — the assessment step. The admin assigns a test by creating an
 * EXAM CalendarEvent for the applicant's user with metadata carrying either a
 * deep-link into the existing exam system (examUrl) or written instructions.
 * Gated behind the TEST feature. (We surface the assigned test rather than open
 * the STUDENT-scoped exam routes, keeping the applicant fully isolated.)
 */
export default async function ApplicantTestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { session } = await requireApplicantFeature("TEST");
  const t = await getTranslations("Applicant");
  const isAr = locale === "ar";

  let loadError = false;
  let tests: Awaited<ReturnType<typeof loadTests>> = [];

  async function loadTests() {
    return prisma.calendarEvent.findMany({
      where: { userId: session.user.id, type: "EXAM" },
      orderBy: { startAt: "desc" },
      take: 15,
    });
  }

  try {
    tests = await loadTests();
  } catch (e) {
    console.error("[applicant/test] load failed:", e);
    loadError = true;
  }

  function detail(metadata: unknown): { url: string | null; instructions: string | null } {
    if (metadata && typeof metadata === "object") {
      const m = metadata as Record<string, unknown>;
      const url = m.examUrl ?? m.url ?? m.link;
      const instructions = m.instructions ?? m.note;
      return {
        url: typeof url === "string" && url.startsWith("http") ? url : null,
        instructions: typeof instructions === "string" ? instructions : null,
      };
    }
    return { url: null, instructions: null };
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-hajr-deep-navy">
          <ClipboardCheck className="h-6 w-6 text-hajr-rose" />
          {t("testTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("testSubtitle")}</p>
      </header>

      {loadError ? (
        <Card className="border-hajr-error/30 bg-hajr-error/5">
          <CardContent className="p-6 text-sm text-hajr-error">{t("testError")}</CardContent>
        </Card>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <FileQuestion className="h-8 w-8 text-hajr-gray-300" />
            {t("testEmpty")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tests.map((ev) => {
            const { url, instructions } = detail(ev.metadata);
            return (
              <li key={ev.id}>
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-hajr-deep-navy">
                        {isAr ? ev.titleAr : ev.title}
                      </p>
                      <Badge variant="info">{t("testAssigned")}</Badge>
                    </div>
                    {instructions && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {instructions}
                      </p>
                    )}
                    {(isAr ? ev.descriptionAr : ev.description) && (
                      <p className="text-sm text-muted-foreground">
                        {isAr ? ev.descriptionAr : ev.description}
                      </p>
                    )}
                    {url && (
                      <Button asChild variant="cta" size="sm">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="me-1.5 h-4 w-4" />
                          {t("testStart")}
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
