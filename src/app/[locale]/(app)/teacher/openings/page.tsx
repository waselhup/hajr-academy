import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { programName } from "@/lib/openings/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { WithdrawButton } from "@/components/openings/withdraw-button";
import { GraduationCap, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

type AppStatus = "SUBMITTED" | "SHORTLISTED" | "SELECTED" | "REJECTED" | "WITHDRAWN";

/** Map a ProgramType enum to an Openings.* i18n key. */
function typeKey(type: string): string {
  switch (type) {
    case "GROUP":
      return "Openings.typeGroup";
    case "PRIVATE":
      return "Openings.typePrivate";
    case "B2B":
      return "Openings.typeB2B";
    case "SELF_STUDY":
      return "Openings.typeSelfStudy";
    default:
      return "Openings.typeGroup";
  }
}

/** Map an application status to its Badge variant + i18n key. */
function statusBadge(status: AppStatus): {
  variant: BadgeProps["variant"];
  key: string;
} {
  switch (status) {
    case "SUBMITTED":
      return { variant: "info", key: "Openings.statusApplied" };
    case "SHORTLISTED":
      return { variant: "navy", key: "Openings.statusShortlisted" };
    case "SELECTED":
      return { variant: "success", key: "Openings.statusSelected" };
    case "REJECTED":
      return { variant: "danger", key: "Openings.statusRejected" };
    case "WITHDRAWN":
      return { variant: "draft", key: "Openings.statusWithdrawn" };
  }
}

export default async function TeacherOpeningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();
  const isAr = locale === "ar";

  let loadError = false;
  let openings: Awaited<ReturnType<typeof loadOpenings>> = [];
  let myApps: Awaited<ReturnType<typeof loadMyApps>> = [];

  async function loadOpenings() {
    return prisma.programOpening.findMany({
      where: { status: "OPEN" },
      include: { program: true },
      orderBy: { openedAt: "desc" },
    });
  }
  async function loadMyApps(teacherId: string) {
    return prisma.teacherApplication.findMany({
      where: { teacherId },
      include: { opening: { include: { program: true } } },
      orderBy: { submittedAt: "desc" },
    });
  }

  try {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    [openings, myApps] = await Promise.all([
      loadOpenings(),
      teacherProfile ? loadMyApps(teacherProfile.id) : Promise.resolve([]),
    ]);
  } catch (e) {
    console.error("[teacher/openings] DB query failed:", e);
    loadError = true;
  }

  // Map openingId → this teacher's application status (for the grid badges).
  const appByOpening = new Map<string, AppStatus>();
  for (const a of myApps) {
    appByOpening.set(a.openingId, a.status as AppStatus);
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-hajr-deep-navy">
          <GraduationCap className="h-7 w-7 text-hajr-rose" />
          {t("Openings.teacherTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Openings.teacherSubtitle")}
        </p>
      </header>

      {loadError ? (
        <Card className="border-hajr-error/30 bg-hajr-error/5">
          <CardContent className="p-6 text-sm text-hajr-error">
            {t("Openings.loadError")}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* OPEN programs */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-hajr-deep-navy">
              {t("Openings.openProgramsHeading")}
            </h2>
            {openings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                  <Inbox className="h-8 w-8 text-hajr-gray-300" />
                  {t("Openings.noOpenings")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {openings.map((o) => {
                  const status = appByOpening.get(o.id);
                  const badge = status ? statusBadge(status) : null;
                  return (
                    <Card key={o.id} className="flex flex-col">
                      <CardHeader className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base text-hajr-deep-navy">
                            {programName(o.program, locale)}
                          </CardTitle>
                          <Badge variant="outline" className="shrink-0">
                            {t(typeKey(o.program.type))}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {isAr ? o.program.descriptionAr : o.program.descriptionEn}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        {badge ? (
                          <Badge variant={badge.variant}>{t(badge.key)}</Badge>
                        ) : (
                          <Button asChild variant="cta" size="sm" className="w-full">
                            <Link href={`/${locale}/teacher/openings/${o.id}`}>
                              {t("Openings.applyCta")}
                            </Link>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* My applications */}
          {myApps.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-hajr-deep-navy">
                {t("Openings.myApplications")}
              </h2>
              <div className="space-y-2">
                {myApps.map((a) => {
                  const badge = statusBadge(a.status as AppStatus);
                  const canWithdraw =
                    a.status === "SUBMITTED" || a.status === "SHORTLISTED";
                  return (
                    <Card key={a.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <Link
                            href={`/${locale}/teacher/openings/${a.openingId}`}
                            className="font-semibold text-hajr-deep-navy hover:underline"
                          >
                            {programName(a.opening.program, locale)}
                          </Link>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t(typeKey(a.opening.program.type))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant}>{t(badge.key)}</Badge>
                          {canWithdraw && <WithdrawButton applicationId={a.id} />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
