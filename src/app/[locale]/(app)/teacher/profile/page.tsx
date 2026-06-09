import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Phone, Star, Users, BadgeDollarSign } from "lucide-react";
import { fmtSAR, fmtUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtSar(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    style: "decimal",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { name: true, nameAr: true, email: true, phone: true, avatar: true } },
    },
  });

  if (!teacher) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("Common.noData")}
        </CardContent>
      </Card>
    );
  }

  const displayName = locale === "ar" && teacher.user.nameAr ? teacher.user.nameAr : teacher.user.name;

  // Earnings + totals
  const [earnings, byStatus, paidThisMonthAgg, totalEarnedAgg] = await Promise.all([
    prisma.teacherEarning.findMany({
      where: { teacherId: teacher.id },
      include: {
        classSession: {
          include: { class: { select: { name: true, nameAr: true, cohortCode: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.teacherEarning.groupBy({
      by: ["status"],
      where: { teacherId: teacher.id },
      _sum: { amount: true },
    }),
    prisma.teacherEarning.aggregate({
      where: {
        teacherId: teacher.id,
        status: "PAID",
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    }),
    prisma.teacherEarning.aggregate({
      where: { teacherId: teacher.id, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amount: true },
    }),
  ]);

  const pending = Number(byStatus.find((r) => r.status === "PENDING")?._sum.amount ?? 0);
  const approved = Number(byStatus.find((r) => r.status === "APPROVED")?._sum.amount ?? 0);
  const paidThisMonth = Number(paidThisMonthAgg._sum.amount ?? 0);
  const totalEarned = Number(totalEarnedAgg._sum.amount ?? 0);

  // Performance — class count, students unique count.
  const [classCount, distinctStudentRows] = await Promise.all([
    prisma.class.count({ where: { teacherId: teacher.id } }),
    prisma.enrollment.findMany({
      where: { status: "ACTIVE", class: { teacherId: teacher.id } },
      select: { studentId: true },
    }),
  ]);
  const studentCount = new Set(distinctStudentRows.map((r) => r.studentId)).size;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("Nav.profile")}</h1>

      {/* Section 1 — Personal Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 ring-4 ring-brand-rose/20">
              {teacher.user.avatar ? (
                <AvatarImage src={teacher.user.avatar} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-brand-navy text-xl text-white">
                {initials(teacher.user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xl font-bold text-brand-navy">{displayName}</h2>
                {teacher.user.nameAr && teacher.user.name !== teacher.user.nameAr && (
                  <p className="text-sm text-muted-foreground">
                    {locale === "ar" ? teacher.user.name : teacher.user.nameAr}
                  </p>
                )}
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{teacher.user.email}</span>
                </div>
                {teacher.user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="num">{teacher.user.phone}</span>
                  </div>
                )}
              </div>

              {teacher.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {teacher.specializations.map((s) => (
                    <Badge key={s} variant="default" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {teacher.bio && (
                <p className="pt-1 text-sm text-muted-foreground">{teacher.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Payment Calculator */}
      <Card className="overflow-hidden border-brand-navy/20 bg-gradient-to-br from-brand-navy/[0.02] to-brand-rose/[0.04]">
        <CardHeader className="border-b border-brand-navy/10 pb-4">
          <CardTitle className="flex items-center gap-2 text-brand-navy">
            <BadgeDollarSign className="h-5 w-5" />
            {t("TeacherPay.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Hourly rate */}
          <div className="rounded-lg border border-brand-navy/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("TeacherPay.currentRate")}
            </p>
            <p className="mt-1 text-3xl font-bold text-brand-navy">
              <span className="num">{fmtSar(Number(teacher.hourlyRate), locale)}</span>{" "}
              <span className="text-base font-normal text-muted-foreground">
                {locale === "ar" ? "ر.س / ساعة" : "SAR/hr"}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("TeacherPay.setByAdmin")}
            </p>
          </div>

          {/* 4 stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label={t("TeacherPay.pending")}
              value={fmtSar(pending, locale)}
              tone="amber"
              locale={locale}
            />
            <StatTile
              label={t("TeacherPay.approved")}
              value={fmtSar(approved, locale)}
              tone="blue"
              locale={locale}
            />
            <StatTile
              label={t("TeacherPay.paidThisMonth")}
              value={fmtSar(paidThisMonth, locale)}
              tone="emerald"
              locale={locale}
            />
            <StatTile
              label={t("TeacherPay.totalEarned")}
              value={fmtSar(totalEarned, locale)}
              tone="navy"
              locale={locale}
            />
          </div>

          {/* Recent earnings table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-brand-navy">
              {t("TeacherPay.recentEarnings")}
            </h3>
            {earnings.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  {t("TeacherPay.noEarnings")}
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("TeacherPay.earningDate")}</TableHead>
                      <TableHead>{t("TeacherPay.earningClass")}</TableHead>
                      <TableHead className="text-end">{t("TeacherPay.earningHours")}</TableHead>
                      <TableHead className="text-end">{t("TeacherPay.earningRate")}</TableHead>
                      <TableHead className="text-end">{t("TeacherPay.earningAmount")}</TableHead>
                      <TableHead className="text-end">{t("TeacherPay.filterStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((e) => {
                      const date = (e.classSession?.scheduledDate ?? e.createdAt).toLocaleDateString(
                        locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"
                      );
                      const className = e.classSession?.class
                        ? locale === "ar"
                          ? e.classSession.class.nameAr ?? e.classSession.class.name
                          : e.classSession.class.name
                        : "—";
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="num text-xs">{date}</TableCell>
                          <TableCell className="text-xs">{className}</TableCell>
                          <TableCell className="num text-end text-xs">
                            {Number(e.hoursWorked).toFixed(2)}
                          </TableCell>
                          <TableCell className="num text-end text-xs">
                            {fmtSar(Number(e.hourlyRate), locale)}
                          </TableCell>
                          <TableCell className="num text-end font-semibold">
                            {fmtSar(Number(e.amount), locale)}
                          </TableCell>
                          <TableCell className="text-end">
                            <StatusBadge status={e.status} locale={locale} t={t} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2b — My rates (read-only, set by admin) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("TeacherPay.myRates")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <RateTile
            label={t("Teachers.colGroupRate")}
            sar={teacher.groupRateSar != null ? Number(teacher.groupRateSar) : null}
            usd={teacher.groupRateUsd != null ? Number(teacher.groupRateUsd) : null}
            locale={locale}
          />
          <RateTile
            label={t("Teachers.colOneToOneRate")}
            sar={teacher.oneToOneRateSar != null ? Number(teacher.oneToOneRateSar) : null}
            usd={teacher.oneToOneRateUsd != null ? Number(teacher.oneToOneRateUsd) : null}
            locale={locale}
          />
        </CardContent>
      </Card>

      {/* Section 3 — Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "أدائي" : "Performance"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <PerfTile
            icon={<Users className="h-4 w-4" />}
            label={locale === "ar" ? "الفصول" : "Classes"}
            value={classCount.toString()}
          />
          <PerfTile
            icon={<Users className="h-4 w-4" />}
            label={locale === "ar" ? "الطلاب" : "Students"}
            value={studentCount.toString()}
          />
          <PerfTile
            icon={<Star className="h-4 w-4" />}
            label={locale === "ar" ? "التقييم" : "Rating"}
            value={teacher.rating ? Number(teacher.rating).toFixed(2) : "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  locale,
}: {
  label: string;
  value: string;
  tone: "amber" | "blue" | "emerald" | "navy";
  locale: string;
}) {
  const toneCls = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    navy: "border-brand-navy/20 bg-brand-navy/5 text-brand-navy",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-lg font-bold">
        <span className="num">{value}</span>
        <span className="ms-1 text-[11px] font-normal opacity-70">
          {locale === "ar" ? "ر.س" : "SAR"}
        </span>
      </p>
    </div>
  );
}

function RateTile({
  label,
  sar,
  usd,
  locale,
}: {
  label: string;
  sar: number | null;
  usd: number | null;
  locale: string;
}) {
  const loc = locale === "ar" ? "ar" : "en";
  return (
    <div className="rounded-lg border border-brand-navy/10 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-navy num">
        {sar != null ? fmtSAR(sar, loc) : "—"}
      </p>
      {usd != null ? (
        <p className="mt-0.5 text-sm text-muted-foreground num">{fmtUSD(usd, loc)}</p>
      ) : null}
    </div>
  );
}

function PerfTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold num">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  locale,
  t,
}: {
  status: string;
  locale: string;
  t: any;
}) {
  if (status === "PENDING") {
    return <Badge variant="warning">{t("TeacherPay.status_PENDING")}</Badge>;
  }
  if (status === "APPROVED") {
    return <Badge variant="info">{t("TeacherPay.status_APPROVED")}</Badge>;
  }
  if (status === "PAID") {
    return <Badge variant="success">{t("TeacherPay.status_PAID")}</Badge>;
  }
  return <Badge variant="default">{status}</Badge>;
}
