"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, FileText } from "lucide-react";

interface Exam {
  id: string;
  type: string;
  title: string;
  titleAr: string;
  description: string | null;
  totalQuestions: number;
  totalMinutes: number;
  passingScore: number;
  bestScore: number | null;
  inProgressAttemptId: string | null;
}

export function ExamListClient({ exams }: { exams: Exam[] }) {
  const t = useTranslations("Exam");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";
  const [confirmExam, setConfirmExam] = useState<Exam | null>(null);
  const [starting, setStarting] = useState(false);

  async function beginExam(exam: Exam) {
    setStarting(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/start`, { method: "POST" });
      if (res.ok) {
        const { attemptId } = await res.json();
        router.push(`/${locale}/student/exams/${exam.id}/take?attempt=${attemptId}`);
      }
    } finally {
      setStarting(false);
      setConfirmExam(null);
    }
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {t("noExams")}
        </CardContent>
      </Card>
    );
  }

  const typeLabel = (type: string) =>
    type === "FULL_MOCK"
      ? t("fullMock")
      : type === "SECTION_DRILL"
      ? t("sectionDrill")
      : t("dailyPractice");

  return (
    <>
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
                    variant={exam.bestScore >= exam.passingScore ? "success" : "warning"}
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
                    onClick={() => setConfirmExam(exam)}
                  >
                    {t("startExam")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
