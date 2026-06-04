"use client";

/**
 * Per-submission grading cards. Shows the student's text + every submitted
 * attachment (inline players / preview / download) and a grade + feedback
 * form. Grading writes through gradeSubmissionAction (server-gated to the
 * owning class teacher); it surfaces the existing grade/feedback fields —
 * no grading math changes here.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User } from "lucide-react";
import { AttachmentList, type AttachmentVM } from "@/components/assignments/attachment-view";
import { gradeSubmissionAction } from "@/lib/assignments/actions";

interface SubmissionVM {
  id: string;
  studentName: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  attachments: AttachmentVM[];
}

export function AssignmentGradingClient({
  locale,
  submissions,
}: {
  locale: string;
  submissions: SubmissionVM[];
}) {
  const ar = locale === "ar";
  return (
    <div className="space-y-3">
      {submissions.map((s) => (
        <SubmissionCard key={s.id} s={s} ar={ar} />
      ))}
    </div>
  );
}

function SubmissionCard({ s, ar }: { s: SubmissionVM; ar: boolean }) {
  const t = useTranslations("Assignments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grade, setGrade] = useState<string>(s.grade != null ? String(s.grade) : "");
  const [feedback, setFeedback] = useState<string>(s.feedback ?? "");

  const onGrade = () => {
    const g = Number(grade);
    if (!Number.isFinite(g) || g < 0 || g > 100) {
      toast.error(t("invalidGrade"));
      return;
    }
    startTransition(async () => {
      const res = await gradeSubmissionAction({ submissionId: s.id, grade: g, feedback: feedback.trim() || undefined });
      if (res.ok) {
        toast.success(t("gradedOk"));
        router.refresh();
      } else {
        toast.error(t("gradeError"));
      }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-brand-navy" />
            <span className="font-medium">{s.studentName}</span>
          </div>
          {s.grade != null ? (
            <Badge variant="success" className="num">{s.grade}/100</Badge>
          ) : (
            <Badge variant="warning">{t("ungraded")}</Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t("submittedAt")}{" "}
          <span className="num">
            {new Date(s.submittedAt).toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-US")}
          </span>
        </p>

        {s.content && <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm">{s.content}</p>}

        <AttachmentList
          attachments={s.attachments}
          source="submission"
          emptyLabel={s.content ? undefined : t("noAttachments")}
        />

        {/* Grade form */}
        <div className="grid gap-2 border-t pt-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor={`grade-${s.id}`}>{t("gradeLabel")}</Label>
            <Input
              id={`grade-${s.id}`}
              type="number"
              min={0}
              max={100}
              className="num"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`fb-${s.id}`}>{t("feedbackLabel")}</Label>
            <Textarea
              id={`fb-${s.id}`}
              rows={1}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={pending}
            />
          </div>
          <Button variant="cta" size="sm" onClick={onGrade} disabled={pending}>
            {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {s.grade != null ? t("updateGrade") : t("saveGrade")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
