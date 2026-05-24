"use client";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, FileText, BookCheck, FlaskConical, Play, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type AssignmentRow = {
  id: string;
  title: string;
  className: string;
  cohortCode: string;
  dueDate: string | null;
  submitted: boolean;
  grade: number | null;
  overdue: boolean;
};

export type LabExerciseRow = {
  id: string;
  type: string;
  level: string;
  title: string;
  attempts: number;
};

export type ExamRow = {
  id: string;
  type: string;
  title: string;
  totalQuestions: number;
  totalMinutes: number;
  passingScore: number;
  bestScore: number | null;
  inProgressAttemptId: string | null;
};

const SKILL_TINT: Record<string, string> = {
  SPEAKING: "bg-rose-50 text-rose-700",
  LISTENING: "bg-blue-50 text-blue-700",
  WRITING: "bg-amber-50 text-amber-700",
  READING: "bg-emerald-50 text-emerald-700",
  GRAMMAR: "bg-purple-50 text-purple-700",
  VOCABULARY: "bg-teal-50 text-teal-700",
};

export function StudentAssignmentsClient({
  locale,
  initialTab,
  assignments,
  labExercises,
  exams,
}: {
  locale: string;
  initialTab: "assignments" | "lab" | "exams";
  assignments: AssignmentRow[];
  labExercises: LabExerciseRow[];
  exams: ExamRow[];
}) {
  const t = useTranslations("Assignments");
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const ar = locale === "ar";
  const [tab, setTab] = useState<"assignments" | "lab" | "exams">(initialTab);

  // Keep URL in sync so deep links + back/forward work.
  const onTabChange = (v: string) => {
    setTab(v as any);
    const p = new URLSearchParams(sp.toString());
    if (v === "assignments") p.delete("tab");
    else p.set("tab", v);
    router.replace(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`, { scroll: false });
  };

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
        <TabsTrigger value="assignments">{t("tabAssignments")}</TabsTrigger>
        <TabsTrigger value="lab">{t("tabLab")}</TabsTrigger>
        <TabsTrigger value="exams">{t("tabExams")}</TabsTrigger>
      </TabsList>

      {/* ── Assignments tab ─────────────────────────────────── */}
      <TabsContent value="assignments" className="space-y-2">
        {assignments.length === 0 ? (
          <EmptyState message={t("emptyAssignments")} />
        ) : (
          assignments.map((a) => <AssignmentCard key={a.id} a={a} locale={locale} t={t} />)
        )}
      </TabsContent>

      {/* ── Lab tab ─────────────────────────────────────────── */}
      <TabsContent value="lab" className="space-y-3">
        {labExercises.length === 0 ? (
          <EmptyState message={t("emptyLab")} />
        ) : (
          <LabGrid locale={locale} exercises={labExercises} />
        )}
      </TabsContent>

      {/* ── Exams tab ───────────────────────────────────────── */}
      <TabsContent value="exams" className="space-y-3">
        {exams.length === 0 ? (
          <EmptyState message={t("emptyExams")} />
        ) : (
          <ExamGrid locale={locale} exams={exams} t={t} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

function AssignmentCard({
  a,
  locale,
  t,
}: {
  a: AssignmentRow;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const ar = locale === "ar";
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BookCheck className="h-4 w-4 shrink-0 text-brand-navy" />
            <p className="truncate font-medium">{a.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.className} · <span className="num">{a.cohortCode}</span>
            {a.dueDate && (
              <>
                {" · "}
                <span className={cn("num", a.overdue && "text-red-600 font-medium")}>
                  {new Date(a.dueDate).toLocaleDateString(ar ? "ar-SA" : "en-GB")}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="shrink-0">
          {a.submitted ? (
            a.grade !== null ? (
              <Badge variant="success" className="num">
                {a.grade}/100
              </Badge>
            ) : (
              <Badge variant="info">{ar ? "تم التسليم" : "Submitted"}</Badge>
            )
          ) : a.overdue ? (
            <Badge variant="danger">{ar ? "متأخر" : "Overdue"}</Badge>
          ) : (
            <Badge variant="warning">{ar ? "بانتظار التسليم" : "Pending"}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LabGrid({ locale, exercises }: { locale: string; exercises: LabExerciseRow[] }) {
  const ar = locale === "ar";
  // Group by skill (type).
  const groups: Record<string, LabExerciseRow[]> = {};
  for (const e of exercises) {
    groups[e.type] = groups[e.type] ?? [];
    groups[e.type].push(e);
  }
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([skill, list]) => (
        <Card key={skill}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full",
                  SKILL_TINT[skill] ?? "bg-muted"
                )}
              >
                <FlaskConical className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold">{skill}</h3>
              <span className="num text-xs text-muted-foreground">({list.length})</span>
            </div>
            <ul className="space-y-1.5">
              {list.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/${locale}/student/lab/exercise/${e.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2.5 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="truncate">{e.title}</span>
                    <Badge variant="info" className="text-[10px]">
                      {e.level}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
            {list.length > 6 && (
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href={`/${locale}/student/lab/${skill.toLowerCase()}`}>
                  {ar ? "عرض المزيد" : "View more"}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExamGrid({
  locale,
  exams,
  t,
}: {
  locale: string;
  exams: ExamRow[];
  t: ReturnType<typeof useTranslations>;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const start = (exam: ExamRow) => {
    if (exam.inProgressAttemptId) {
      router.push(`/${locale}/student/exams/${exam.id}/take?attempt=${exam.inProgressAttemptId}`);
      return;
    }
    setBusy(exam.id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/exams/${exam.id}/start`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Failed to start exam");
          return;
        }
        router.push(`/${locale}/student/exams/${exam.id}/take?attempt=${data.attemptId}`);
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {exams.map((e) => {
        const passed = e.bestScore != null && e.bestScore >= e.passingScore;
        return (
          <Card key={e.id} className="overflow-hidden">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {e.type}
                  </p>
                  <h3 className="mt-1 truncate font-semibold text-brand-navy">{e.title}</h3>
                </div>
                {e.bestScore != null && (
                  <Badge variant={passed ? "success" : "warning"} className="num">
                    <Trophy className="me-1 h-3 w-3" />
                    {Math.round(e.bestScore)}%
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> <span className="num">{e.totalQuestions}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> <span className="num">{e.totalMinutes}</span>{" "}
                  {ar ? "د" : "min"}
                </span>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={busy === e.id || isPending}
                onClick={() => start(e)}
              >
                <Play className="me-2 h-3.5 w-3.5" />
                {e.inProgressAttemptId
                  ? ar
                    ? "تابع"
                    : "Continue"
                  : e.bestScore != null
                  ? t("viewResult")
                  : t("startExam")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
