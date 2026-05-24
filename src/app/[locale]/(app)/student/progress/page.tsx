import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getStudentScope } from "@/lib/student/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Calendar,
  GraduationCap,
  FlaskConical,
  FileText,
  Trophy,
  CheckCircle2,
  Award,
  Star,
  Zap,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Cefr = (typeof CEFR_ORDER)[number];

const SKILL_TINT: Record<string, { bg: string; text: string }> = {
  SPEAKING: { bg: "bg-rose-50", text: "text-rose-700" },
  LISTENING: { bg: "bg-blue-50", text: "text-blue-700" },
  WRITING: { bg: "bg-amber-50", text: "text-amber-700" },
  READING: { bg: "bg-emerald-50", text: "text-emerald-700" },
  GRAMMAR: { bg: "bg-purple-50", text: "text-purple-700" },
  VOCABULARY: { bg: "bg-teal-50", text: "text-teal-700" },
};

function fmtNum(n: number, ar: boolean): string {
  return ar ? n.toLocaleString("ar-SA") : String(n);
}

function nextLevel(level: Cefr): Cefr | null {
  const i = CEFR_ORDER.indexOf(level);
  if (i < 0 || i >= CEFR_ORDER.length - 1) return null;
  return CEFR_ORDER[i + 1];
}

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations("StudentProgress");
  const tLab = await getTranslations("Lab");
  const ar = locale === "ar";

  const scope = await getStudentScope(session.user.id);

  if (!scope) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد بيانات بعد." : "No data yet."}
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400_000);

  const [
    attendance,
    submissions,
    skillLevels,
    examAttempts,
    completedLabAttempts,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId: scope.studentId,
        session: { scheduledDate: { gte: sixtyDaysAgo } },
      },
      select: { status: true },
    }),
    prisma.submission.findMany({
      where: { studentId: scope.studentId, grade: { not: null } },
      orderBy: { gradedAt: "desc" },
      take: 10,
      include: {
        assignment: {
          select: {
            title: true,
            titleAr: true,
            class: { select: { name: true, nameAr: true, cohortCode: true } },
          },
        },
      },
    }),
    prisma.skillLevel.findMany({
      where: { studentId: scope.studentId },
      orderBy: { skill: "asc" },
    }),
    prisma.examAttempt.findMany({
      where: {
        studentId: scope.studentId,
        status: "COMPLETED",
        totalScore: { not: null },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: { exam: { select: { title: true, titleAr: true, passingScore: true } } },
    }),
    prisma.labAttempt.count({
      where: { studentId: scope.studentId, status: "COMPLETED" },
    }),
  ]);

  // ── Attendance tallies
  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const late = attendance.filter((a) => a.status === "LATE").length;
  const absent = attendance.filter((a) => a.status === "ABSENT").length;
  const excused = attendance.filter((a) => a.status === "EXCUSED").length;
  const totalA = attendance.length;
  const attendedCount = present + late;
  const attendancePct =
    totalA > 0 ? Math.round(((present + late * 0.5) / totalA) * 100) : 0;

  // ── Grades
  const grades = submissions.map((s) => Number(s.grade ?? 0));
  const avgGrade =
    grades.length > 0
      ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length)
      : 0;

  // ── Achievements (compute simple, server-side)
  const passedExam = examAttempts.some(
    (a) => Number(a.totalScore ?? 0) >= a.exam.passingScore
  );
  const topGrade = grades.some((g) => g >= 90);
  // "Perfect Week" — check the last 7 days
  const lastWeekAtt = attendance.length; // simplified: any attendance
  // Compute properly: sessions in last 7d and all present
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000);
  const weekRows = await prisma.attendance.findMany({
    where: {
      studentId: scope.studentId,
      session: { scheduledDate: { gte: sevenDaysAgo } },
    },
    select: { status: true },
  });
  const perfectWeek =
    weekRows.length >= 1 && weekRows.every((r) => r.status === "PRESENT");

  const achievements = [
    {
      id: "firstClass",
      icon: Star,
      tint: "bg-amber-50 text-amber-700 ring-amber-200",
      title: t("ach_firstClass"),
      desc: t("ach_firstClass_desc"),
      unlocked: attendedCount >= 1,
    },
    {
      id: "perfectWeek",
      icon: CheckCircle2,
      tint: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      title: t("ach_perfectWeek"),
      desc: t("ach_perfectWeek_desc"),
      unlocked: perfectWeek,
    },
    {
      id: "topGrade",
      icon: Trophy,
      tint: "bg-rose-50 text-rose-700 ring-rose-200",
      title: t("ach_topGrade"),
      desc: t("ach_topGrade_desc"),
      unlocked: topGrade,
    },
    {
      id: "examPass",
      icon: Award,
      tint: "bg-blue-50 text-blue-700 ring-blue-200",
      title: t("ach_examPass"),
      desc: t("ach_examPass_desc"),
      unlocked: passedExam,
    },
    {
      id: "labStreak",
      icon: Zap,
      tint: "bg-purple-50 text-purple-700 ring-purple-200",
      title: t("ach_labStreak"),
      desc: t("ach_labStreak_desc"),
      unlocked: completedLabAttempts >= 5,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy text-white">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{t("pageTitle")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>
      </div>

      {/* ── Attendance Hero ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-brand-rose" />
            {t("attendanceTitle")}
            <span className="ms-auto text-xs font-normal text-muted-foreground">
              {t("attendanceLast60")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalA === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("attendanceEmpty")}
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("sessionsAttended")}
                  </p>
                  <p className="mt-1 text-3xl font-bold num text-brand-navy">
                    {fmtNum(attendedCount, ar)}{" "}
                    <span className="text-base font-normal text-muted-foreground">
                      {t("of")} {fmtNum(totalA, ar)}
                    </span>
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    %
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-bold num",
                      attendancePct >= 90
                        ? "text-emerald-600"
                        : attendancePct >= 75
                        ? "text-amber-600"
                        : "text-red-600"
                    )}
                  >
                    {fmtNum(attendancePct, ar)}%
                  </p>
                </div>
              </div>

              <Progress value={attendancePct} className="h-2" />

              <div className="grid grid-cols-4 gap-2">
                <AttPill label={t("attendancePresent")} value={present} tone="emerald" ar={ar} />
                <AttPill label={t("attendanceLate")} value={late} tone="amber" ar={ar} />
                <AttPill label={t("attendanceAbsent")} value={absent} tone="red" ar={ar} />
                <AttPill label={t("attendanceExcused")} value={excused} tone="blue" ar={ar} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Grades + Exams (side by side on lg) ───────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Grades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-brand-rose" />
              {t("gradesTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("gradesSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("gradesEmpty")}
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between rounded-lg bg-brand-navy/[0.04] p-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("gradesAverage")}
                  </span>
                  <span
                    className={cn(
                      "text-2xl font-bold num",
                      avgGrade >= 85
                        ? "text-emerald-600"
                        : avgGrade >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                    )}
                  >
                    {fmtNum(avgGrade, ar)}%
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {submissions.map((s) => {
                    const grade = Number(s.grade ?? 0);
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {ar
                              ? s.assignment.titleAr ?? s.assignment.title
                              : s.assignment.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ar
                              ? s.assignment.class.nameAr ?? s.assignment.class.name
                              : s.assignment.class.name}
                          </p>
                        </div>
                        <Badge
                          variant={
                            grade >= 85
                              ? "success"
                              : grade >= 60
                              ? "warning"
                              : "danger"
                          }
                          className="num"
                        >
                          {fmtNum(grade, ar)}/100
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exams */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-brand-rose" />
              {t("examsTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("examsSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {examAttempts.length === 0 ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">{t("examsEmpty")}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/${locale}/student/assignments?tab=exams`}>
                    {ar ? "تصفّح الاختبارات" : "Browse exams"}
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {examAttempts.map((a) => {
                  const score = Math.round(Number(a.totalScore ?? 0));
                  const passed = score >= a.exam.passingScore;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/${locale}/student/exams/results/${a.id}`}
                        className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2.5 text-sm transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {ar ? a.exam.titleAr : a.exam.title}
                          </p>
                          {a.submittedAt && (
                            <p className="num text-xs text-muted-foreground">
                              {a.submittedAt.toLocaleDateString(ar ? "ar-SA" : "en-GB")}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={passed ? "success" : "warning"}
                          className="num shrink-0"
                        >
                          <Trophy className="me-1 h-3 w-3" />
                          {fmtNum(score, ar)}%
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Lab Skill Levels ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-brand-rose" />
            {t("labTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("labSubtitle")}</p>
        </CardHeader>
        <CardContent>
          {skillLevels.length === 0 ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">{t("labEmpty")}</p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}/student/assignments?tab=lab`}>
                  {ar ? "افتح المختبر" : "Open Lab"}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {skillLevels.map((sl) => {
                const tint = SKILL_TINT[sl.skill] ?? {
                  bg: "bg-muted",
                  text: "text-foreground",
                };
                const lvl = sl.currentLevel as Cefr;
                const next = nextLevel(lvl);
                const conf = Math.max(0, Math.min(100, Number(sl.confidence) || 0));
                return (
                  <div
                    key={sl.id}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full",
                            tint.bg,
                            tint.text
                          )}
                        >
                          <FlaskConical className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium">
                          {tLab(`skill${capitalize(sl.skill)}` as any)}
                        </span>
                      </div>
                      <Badge variant="info">{lvl}</Badge>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <Progress value={conf} className="h-1.5" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span className="num">
                          {tLab("points")}: {fmtNum(sl.totalPoints, ar)}
                        </span>
                        {next ? (
                          <span>{t("labProgressTo", { next })}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Achievements ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-brand-rose" />
            {t("achievementsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <div
                  key={ach.id}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all",
                    ach.unlocked
                      ? `ring-1 ${ach.tint}`
                      : "bg-muted/30 opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-12 w-12 items-center justify-center rounded-full",
                      ach.unlocked ? "" : "bg-muted"
                    )}
                  >
                    {ach.unlocked ? (
                      <Icon className="h-6 w-6" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold leading-tight">
                      {ach.title}
                    </p>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      {ach.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttPill({
  label,
  value,
  tone,
  ar,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red" | "blue";
  ar: boolean;
}) {
  const cls = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
  }[tone];
  return (
    <div className={cn("rounded-md border p-2 text-center", cls)}>
      <p className="text-lg font-bold num">{fmtNum(value, ar)}</p>
      <p className="text-[10px] leading-tight opacity-80">{label}</p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
