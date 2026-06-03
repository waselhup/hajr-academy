import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Mail, Phone, User as UserIcon, MessagesSquare } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ALL_FEATURES } from "@/lib/applicants/service";
import { AdminApplicantControls } from "@/components/applicant/admin-controls";
import type { ApplicantFeature } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminApplicantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Applicant");
  const isAr = locale === "ar";

  const applicant = await prisma.applicantProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
      appliedProgram: { select: { nameEn: true, nameAr: true } },
      featureAccess: true,
    },
  });

  if (!applicant) {
    return (
      <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
        <Link
          href="/admin/applicants"
          className="inline-flex items-center gap-1 text-sm text-hajr-muted hover:text-hajr-deep-navy"
        >
          <ArrowLeft className="h-4 w-4 rtl-flip" />
          {t("adminTitle")}
        </Link>
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            {t("adminNotFound")}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Message thread (both directions) between this applicant and admins.
  const messages = await prisma.message.findMany({
    where: {
      channel: "IN_APP",
      triggerType: "MANUAL",
      OR: [{ fromUserId: applicant.user.id }, { toUserId: applicant.user.id }],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { fromUser: { select: { name: true, role: true } } },
  });

  const enabledFeatures: ApplicantFeature[] = ALL_FEATURES.filter((f) =>
    applicant.featureAccess.some((r) => r.feature === f && r.enabled)
  );

  const program = applicant.appliedProgram
    ? isAr
      ? applicant.appliedProgram.nameAr
      : applicant.appliedProgram.nameEn
    : null;

  const dateFmt = new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <Link
        href="/admin/applicants"
        className="inline-flex items-center gap-1 text-sm text-hajr-muted hover:text-hajr-deep-navy"
      >
        <ArrowLeft className="h-4 w-4 rtl-flip" />
        {t("adminTitle")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">{applicant.fullName}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {applicant.user.email}
            </span>
            {applicant.phone && (
              <span className="inline-flex items-center gap-1.5" dir="ltr">
                <Phone className="h-4 w-4" />
                {applicant.phone}
              </span>
            )}
            {applicant.gender && (
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="h-4 w-4" />
                {t(applicant.gender === "MALE" ? "filterMale" : "filterFemale")}
              </span>
            )}
          </div>
          {program && (
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">{t("colProgram")}: </span>
              <span className="font-medium text-hajr-deep-navy">{program}</span>
            </p>
          )}
        </div>
        {applicant.isReadOnly && <Badge variant="draft">{t("closedTag")}</Badge>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Message thread */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-hajr-deep-navy">
            <MessagesSquare className="h-5 w-5 text-hajr-rose" />
            {t("adminThreadTitle")}
          </h2>
          {messages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {t("adminThreadEmpty")}
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {messages.map((m) => {
                const fromAdmin = m.fromUser?.role === "ADMIN" || m.fromUser?.role === "SUPER_ADMIN";
                return (
                  <li
                    key={m.id}
                    className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        fromAdmin
                          ? "bg-hajr-deep-navy text-white"
                          : "border border-hajr-gray-200 bg-white text-hajr-deep-navy"
                      }`}
                    >
                      {m.subject && <p className="mb-0.5 text-xs font-semibold opacity-80">{m.subject}</p>}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <time
                        className={`mt-1 block text-[0.65rem] ${fromAdmin ? "text-white/60" : "text-hajr-muted"}`}
                      >
                        {dateFmt.format(m.createdAt)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Controls */}
        <aside>
          <AdminApplicantControls
            applicantId={applicant.id}
            applicantUserId={applicant.user.id}
            currentStage={applicant.stage}
            enabledFeatures={enabledFeatures}
            isReadOnly={applicant.isReadOnly}
          />
        </aside>
      </div>
    </div>
  );
}
