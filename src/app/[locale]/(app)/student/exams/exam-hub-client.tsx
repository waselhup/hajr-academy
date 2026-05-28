"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Clock, FileText, Lock } from "lucide-react";

export type HubExam = {
  id: string;
  type: string;
  testType: string;
  title: string;
  titleAr: string;
  description: string | null;
  totalQuestions: number;
  totalMinutes: number;
  passingScore: number;
  bestScore: number | null;
  inProgressAttemptId: string | null;
};

export type ExamGroup = {
  type: "ALL" | "STEP" | "IELTS_PRACTICE" | "TOEFL_PRACTICE";
  label: string;
  exams: HubExam[];
};

export function ExamHubClient({
  groups,
  defaultTab,
  stepLocked,
}: {
  groups: ExamGroup[];
  defaultTab: ExamGroup["type"];
  stepLocked: boolean;
}) {
  const t = useTranslations("Exam");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAr = locale === "ar";
  const [tab, setTab] = useState<ExamGroup["type"]>(defaultTab);
  const [confirmExam, setConfirmExam] = useState<HubExam | null>(null);
  const [starting, setStarting] = useState(false);
  const [, startTransition] = useTransition();

  // Sync ?tab= to the URL on change without a full reload, so deep links
  // and back/forward work.
  function handleTabChange(next: string) {
    const value = next as ExamGroup["type"];
    setTab(value);
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set("tab", value);
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  }

  async function beginExam(exam: HubExam) {
    setStarting(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/start`, { method: "POST" });
      if (res.ok) {
        const { attemptId } = await res.json();
        router.push(
          `/${locale}/student/exams/${exam.id}/take?attempt=${attemptId}`
        );
      }
    } finally {
      setStarting(false);
      setConfirmExam(null);
    }
  }

  const typeLabel = (type: string) =>
    type === "FULL_MOCK"
      ? t("fullMock")
      : type === "SECTION_DRILL"
      ? t("sectionDrill")
      : t("dailyPractice");

  return (
    <>
      {stepLocked && (
        <Card className="border-hajr-rose/30 bg-hajr-rose/5">
          <CardContent className="flex items-start gap-3 p-4">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hajr-rose/10 text-hajr-rose">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-brand-navy">
                {t("stepLockedTitle")}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("stepLockedBody")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={handleTabChange}>
        {/* Horizontally scrolls on narrow screens (mobile-first guardrail). */}
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="flex w-max min-w-full justify-start">
            {groups.map((g) => (
              <TabsTrigger key={g.type} value={g.type} className="shrink-0">
                {g.label}
                <span
                  className={cn(
                    "ms-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[0.65rem] font-semibold",
                    "bg-hajr-deep-navy/10 text-hajr-deep-navy",
                    "num"
                  )}
                >
                  {g.exams.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {groups.map((g) => (
          <TabsContent key={g.type} value={g.type} className="mt-4">
            <ExamGrid
              exams={g.exams}
              isAr={isAr}
              t={t}
              typeLabel={typeLabel}
              locale={locale}
              router={router}
              onStart={(ex) => setConfirmExam(ex)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog
        open={!!confirmExam}
        onOpenChange={(o) => !o && setConfirmExam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("startConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("startConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("previous")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={starting}
              onClick={() => confirmExam && beginExam(confirmExam)}
            >
              {t("confirmStart")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ExamGrid({
  exams,
  isAr,
  t,
  typeLabel,
  locale,
  router,
  onStart,
}: {
  exams: HubExam[];
  isAr: boolean;
  t: (key: string) => string;
  typeLabel: (type: string) => string;
  locale: string;
  router: ReturnType<typeof useRouter>;
  onStart: (exam: HubExam) => void;
}) {
  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {t("noExams")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {exams.map((exam) => (
        <Card key={exam.id} className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-hajr-hover/40">
                <FileText className="h-5 w-5 text-brand-navy" />
              </div>
              <Badge variant="info">{typeLabel(exam.type)}</Badge>
            </div>
            <div className="mt-3 font-semibold">
              {isAr ? exam.titleAr : exam.title}
            </div>
            {exam.description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {exam.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="num">{exam.totalMinutes}</span> {t("minutes")}
              </span>
              <span className="num">
                {exam.totalQuestions} {t("questions")}
              </span>
              <span>
                {t("passingScore")}:{" "}
                <span className="num">{exam.passingScore}%</span>
              </span>
            </div>
            {exam.bestScore != null && (
              <div className="mt-2 text-xs">
                {t("lastScore")}:{" "}
                <Badge
                  variant={
                    exam.bestScore >= exam.passingScore ? "success" : "warning"
                  }
                  className="num"
                >
                  {Math.round(exam.bestScore)}%
                </Badge>
              </div>
            )}
            <div className="mt-4">
              {exam.inProgressAttemptId ? (
                <Button
                  className="w-full bg-hajr-deep-navy text-white"
                  onClick={() =>
                    router.push(
                      `/${locale}/student/exams/${exam.id}/take?attempt=${exam.inProgressAttemptId}`
                    )
                  }
                >
                  {t("resumeExam")}
                </Button>
              ) : (
                <Button
                  className="w-full bg-hajr-deep-navy text-white"
                  onClick={() => onStart(exam)}
                >
                  {t("startExam")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
