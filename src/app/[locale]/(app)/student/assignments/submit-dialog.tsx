"use client";

/**
 * Student submission composer dialog. Shows the teacher's assignment material
 * (players/downloads), then a response composer offering exactly the kinds the
 * teacher allowed (record video / record voice / upload files) plus a text box
 * which is always available as a fallback. Respects the graded lock: once a
 * grade exists the submission is read-only. Re-submission before grading
 * replaces the previous attempt.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import {
  AttachmentComposer,
  type StagedAttachment,
  type AttachmentKind,
} from "@/components/assignments/attachment-composer";
import { AttachmentList, type AttachmentVM } from "@/components/assignments/attachment-view";
import { submitAssignmentAction } from "@/lib/assignments/actions";

export interface SubmitDialogAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  allowedResponseTypes: string[];
  materialAttachments: AttachmentVM[];
  submitted: boolean;
  grade: number | null;
  feedback: string | null;
  submissionContent: string | null;
  submissionAttachments: AttachmentVM[];
}

export function SubmitDialog({
  locale,
  assignment,
  open,
  onOpenChange,
}: {
  locale: string;
  assignment: SubmitDialogAssignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Assignments");
  const router = useRouter();
  const ar = locale === "ar";
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState(assignment.submissionContent ?? "");
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);

  const locked = assignment.grade != null; // graded → read-only
  const allowedKinds = (assignment.allowedResponseTypes.filter((k) =>
    ["VIDEO", "AUDIO", "FILE"].includes(k)
  ) as AttachmentKind[]);

  const onSubmit = () => {
    if (!content.trim() && attachments.length === 0) {
      toast.error(t("emptySubmission"));
      return;
    }
    startTransition(async () => {
      const res = await submitAssignmentAction({
        assignmentId: assignment.id,
        content: content.trim() || undefined,
        attachments: attachments.map(({ kind, path, fileName, mimeType, sizeBytes, durationSec }) => ({
          kind,
          path,
          fileName,
          mimeType,
          sizeBytes,
          durationSec,
        })),
      });
      if (res.ok) {
        toast.success(t("submittedOk"));
        setAttachments([]);
        onOpenChange(false);
        router.refresh();
      } else if (res.error === "ALREADY_GRADED") {
        toast.error(t("alreadyGraded"));
      } else {
        toast.error(t("submitError"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {assignment.description && <p className="text-sm">{assignment.description}</p>}

          {/* Teacher material */}
          {assignment.materialAttachments.length > 0 && (
            <div className="space-y-2">
              <Label>{t("materialLabel")}</Label>
              <AttachmentList attachments={assignment.materialAttachments} source="assignment" />
            </div>
          )}

          {/* Already graded → show result + the submitted work read-only */}
          {locked ? (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label>{t("yourSubmission")}</Label>
                <Badge variant="success" className="num">{assignment.grade}/100</Badge>
              </div>
              {assignment.submissionContent && (
                <p className="whitespace-pre-wrap text-sm">{assignment.submissionContent}</p>
              )}
              <AttachmentList attachments={assignment.submissionAttachments} source="submission" />
              {assignment.feedback && (
                <div className="rounded-md bg-white p-3 text-sm">
                  <p className="mb-1 font-medium">{t("feedbackLabel")}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{assignment.feedback}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {assignment.submitted && (
                <p className="rounded-md bg-blue-50 p-2.5 text-xs text-blue-700">
                  {t("resubmitNote")}
                </p>
              )}

              {/* Text response — always available */}
              <div className="space-y-1.5">
                <Label htmlFor="sub-text">{t("responseTextLabel")}</Label>
                <Textarea
                  id="sub-text"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("responseTextHint")}
                  disabled={pending}
                />
              </div>

              {/* Allowed rich responses */}
              {allowedKinds.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("responseAttachLabel")}</Label>
                  <AttachmentComposer
                    allowedKinds={allowedKinds}
                    value={attachments}
                    onChange={setAttachments}
                    disabled={pending}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {!locked && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button variant="cta" size="sm" onClick={onSubmit} disabled={pending}>
              {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {assignment.submitted ? t("resubmit") : t("submitWork")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
