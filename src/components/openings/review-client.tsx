"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ListChecks, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  selectApplicantAction,
  shortlistApplicantAction,
  rejectApplicantAction,
  reopenOpeningAction,
  closeOpeningAction,
} from "@/app/[locale]/(app)/admin/_actions/openings";

type AppStatus = "SUBMITTED" | "SHORTLISTED" | "SELECTED" | "REJECTED" | "WITHDRAWN";

type Application = {
  id: string;
  status: AppStatus;
  whyQualified: string;
  answersJson: Record<string, string>;
  voiceSignedUrl: string | null;
  teacherName: string;
  teacherEmail: string;
  submittedAt: string | null;
  decisionNote: string | null;
};

const STATUS_VARIANT: Record<AppStatus, "info" | "navy" | "success" | "danger" | "draft"> = {
  SUBMITTED: "info",
  SHORTLISTED: "navy",
  SELECTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "draft",
};

export function ReviewClient({
  openingId,
  openingStatus,
  applications,
  surveyLabels,
}: {
  openingId: string;
  openingStatus: "OPEN" | "CLOSED" | "FILLED";
  applications: Application[];
  surveyLabels: { id: string; label: string }[];
}) {
  const t = useTranslations("Openings");
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<
    | { kind: "select" | "reject"; applicationId: string; teacherName: string }
    | null
  >(null);

  const isFilled = openingStatus === "FILLED";

  const statusLabel = (s: AppStatus): string => {
    switch (s) {
      case "SUBMITTED":
        return t("statusSubmitted");
      case "SHORTLISTED":
        return t("statusShortlisted");
      case "SELECTED":
        return t("statusSelected");
      case "REJECTED":
        return t("statusRejected");
      case "WITHDRAWN":
        return t("statusWithdrawn");
    }
  };

  const onResult = (res: { ok: true } | { ok: false; error: string }, successLabel: string) => {
    if (res.ok) {
      toast.success(successLabel);
      router.refresh();
    } else {
      toast.error(mapError(res.error, t));
    }
  };

  const handleShortlist = (applicationId: string) => {
    startTransition(async () => {
      const res = await shortlistApplicantAction(applicationId);
      onResult(res, t("shortlist"));
    });
  };

  const handleReopen = () => {
    startTransition(async () => {
      const res = await reopenOpeningAction(openingId);
      onResult(res, t("reopen"));
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      const res = await closeOpeningAction(openingId);
      onResult(res, t("close"));
    });
  };

  const handleConfirm = (note: string) => {
    if (!confirm) return;
    const trimmed = note.trim() || undefined;
    const { kind, applicationId } = confirm;
    startTransition(async () => {
      const res =
        kind === "select"
          ? await selectApplicantAction(applicationId, trimmed)
          : await rejectApplicantAction(applicationId, trimmed);
      onResult(res, kind === "select" ? t("select") : t("reject"));
      if (res.ok) setConfirm(null);
    });
  };

  // When filled, surface the selected teacher first; grey the rest.
  const ordered = isFilled
    ? [...applications].sort((a, b) => (a.status === "SELECTED" ? -1 : 0) - (b.status === "SELECTED" ? -1 : 0))
    : applications;

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Opening-level actions */}
      <div className="flex flex-wrap items-center gap-2">
        {openingStatus === "OPEN" ? (
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("close")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleReopen} disabled={isPending}>
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("reopen")}
          </Button>
        )}
      </div>

      {isFilled && (
        <div className="rounded-lg border border-hajr-border bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("filledBanner")}
        </div>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            {t("noApplications")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordered.map((app) => {
            const greyed = isFilled && app.status !== "SELECTED";
            const submitted = app.submittedAt
              ? new Date(app.submittedAt).toLocaleString(isAr ? "ar-SA" : "en-US")
              : null;
            const canShortlist = !isFilled && app.status === "SUBMITTED";
            const canSelect = !isFilled && (app.status === "SUBMITTED" || app.status === "SHORTLISTED");
            const canReject = !isFilled && (app.status === "SUBMITTED" || app.status === "SHORTLISTED");

            return (
              <Card key={app.id} className={greyed ? "opacity-60" : undefined}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-hajr-navy">{app.teacherName}</h3>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {app.teacherEmail}
                      </p>
                      {submitted && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("submittedAt")}: <span className="num">{submitted}</span>
                        </p>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[app.status]}>{statusLabel(app.status)}</Badge>
                  </div>

                  {/* Why qualified */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("whyQualifiedLabel")}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-hajr-navy">{app.whyQualified}</p>
                  </div>

                  {/* Survey answers */}
                  {surveyLabels.some((q) => app.answersJson[q.id]) && (
                    <div className="space-y-3">
                      {surveyLabels.map((q) => {
                        const answer = app.answersJson[q.id];
                        if (!answer) return null;
                        return (
                          <div key={q.id} className="space-y-1">
                            <div className="text-xs font-semibold uppercase text-muted-foreground">
                              {q.label}
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-hajr-navy">{answer}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Voice intro */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("voiceIntro")}
                    </div>
                    {app.voiceSignedUrl ? (
                      <audio controls src={app.voiceSignedUrl} className="w-full" />
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("noVoice")}</p>
                    )}
                  </div>

                  {/* Decision note (if a decision was already recorded) */}
                  {app.decisionNote && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        {t("decisionNote")}
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {app.decisionNote}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {(canShortlist || canSelect || canReject) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {canShortlist && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShortlist(app.id)}
                          disabled={isPending}
                        >
                          <ListChecks className="me-2 h-4 w-4" />
                          {t("shortlist")}
                        </Button>
                      )}
                      {canSelect && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() =>
                            setConfirm({ kind: "select", applicationId: app.id, teacherName: app.teacherName })
                          }
                          disabled={isPending}
                        >
                          <CheckCircle2 className="me-2 h-4 w-4" />
                          {t("select")}
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setConfirm({ kind: "reject", applicationId: app.id, teacherName: app.teacherName })
                          }
                          disabled={isPending}
                        >
                          <XCircle className="me-2 h-4 w-4" />
                          {t("reject")}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {confirm && (
        <DecisionDialog
          kind={confirm.kind}
          teacherName={confirm.teacherName}
          isPending={isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

function DecisionDialog({
  kind,
  teacherName,
  isPending,
  onCancel,
  onConfirm,
}: {
  kind: "select" | "reject";
  teacherName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const t = useTranslations("Openings");
  const [note, setNote] = useState("");

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "select" ? t("confirmSelect") : t("confirmReject")}</DialogTitle>
          <DialogDescription>{teacherName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t("decisionNote")}</Label>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t("decisionNoteHint")}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant={kind === "select" ? "success" : "destructive"}
            onClick={() => onConfirm(note)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {kind === "select" ? t("select") : t("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapError(code: string, t: ReturnType<typeof useTranslations>): string {
  switch (code) {
    case "ALREADY_FILLED":
      return t("filledBanner");
    case "NOT_FOUND":
      return t("loadError");
    case "WITHDRAWN":
      return t("statusWithdrawn");
    case "INVALID_STATE":
    case "ALREADY_OPEN":
    case "ALREADY_CLOSED":
    default:
      return t("loadError");
  }
}
