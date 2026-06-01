"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, GraduationCap, UserX, Send } from "lucide-react";
import type { ApplicantFeature, ApplicantStage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  setStageAction,
  toggleFeatureAction,
  convertToTeacherAction,
  closeApplicantAction,
  messageApplicantAction,
} from "@/app/[locale]/(app)/admin/applicants/_actions";

const STAGES: ApplicantStage[] = ["NEW", "MESSAGING", "INTERVIEW", "TESTING", "DEMO", "DECISION"];
const FEATURES: ApplicantFeature[] = [
  "OVERVIEW",
  "OPENINGS",
  "MESSAGING",
  "MEETINGS",
  "TEST",
  "DEMO_RECORDING",
];

export function AdminApplicantControls({
  applicantId,
  applicantUserId,
  currentStage,
  enabledFeatures,
  isReadOnly,
}: {
  applicantId: string;
  applicantUserId: string;
  currentStage: ApplicantStage;
  enabledFeatures: ApplicantFeature[];
  isReadOnly: boolean;
}) {
  const t = useTranslations("Applicant");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyFeature, setBusyFeature] = useState<ApplicantFeature | null>(null);
  const [enabled, setEnabled] = useState<Set<ApplicantFeature>>(new Set(enabledFeatures));
  const [stage, setStage] = useState<ApplicantStage>(currentStage);
  const [message, setMessage] = useState("");

  const onSetStage = (next: ApplicantStage) => {
    startTransition(async () => {
      const res = await setStageAction(applicantId, next);
      if (res.ok) {
        setStage(next);
        toast.success(t("adminStageUpdated"));
        router.refresh();
      } else {
        toast.error(t("adminActionError"));
      }
    });
  };

  const onToggle = (feature: ApplicantFeature, value: boolean) => {
    setBusyFeature(feature);
    startTransition(async () => {
      const res = await toggleFeatureAction(applicantId, feature, value);
      if (res.ok) {
        setEnabled((prev) => {
          const n = new Set(prev);
          if (value) n.add(feature);
          else n.delete(feature);
          return n;
        });
        toast.success(value ? t("adminFeatureOn") : t("adminFeatureOff"));
        router.refresh();
      } else {
        toast.error(t("adminActionError"));
      }
      setBusyFeature(null);
    });
  };

  const onConvert = () => {
    if (!confirm(t("adminConvertConfirm"))) return;
    startTransition(async () => {
      const res = await convertToTeacherAction(applicantId);
      if (res.ok) {
        toast.success(t("adminConvertOk"));
        router.refresh();
      } else {
        toast.error(t("adminActionError"));
      }
    });
  };

  const onClose = () => {
    if (!confirm(t("adminCloseConfirm"))) return;
    startTransition(async () => {
      const res = await closeApplicantAction(applicantId, message.trim() || undefined);
      if (res.ok) {
        toast.success(t("adminCloseOk"));
        setMessage("");
        router.refresh();
      } else {
        toast.error(t("adminActionError"));
      }
    });
  };

  const onSendMessage = () => {
    const text = message.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await messageApplicantAction(applicantUserId, text);
      if (res.ok) {
        toast.success(t("adminMessageSent"));
        setMessage("");
        router.refresh();
      } else {
        toast.error(t("adminActionError"));
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Stage control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-hajr-deep-navy">{t("adminStageTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("adminStageHint")}</p>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending || isReadOnly}
                onClick={() => onSetStage(s)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 ${
                  stage === s
                    ? "border-hajr-rose bg-hajr-rose/10 text-hajr-rose"
                    : "border-hajr-gray-200 text-hajr-gray-500 hover:border-hajr-gray-300"
                }`}
              >
                {t(("stageChip" + s) as never)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-feature toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-hajr-deep-navy">{t("adminFeaturesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="mb-2 text-xs text-muted-foreground">{t("adminFeaturesHint")}</p>
          {FEATURES.map((f) => {
            const isOn = enabled.has(f);
            const locked = f === "OVERVIEW"; // always on; cannot be turned off
            return (
              <div
                key={f}
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-hajr-gray-50"
              >
                <Label htmlFor={`feat_${f}`} className="text-sm text-hajr-deep-navy">
                  {t(("feature" + f) as never)}
                </Label>
                <span className="flex items-center gap-2">
                  {busyFeature === f && <Loader2 className="h-4 w-4 animate-spin text-hajr-muted" />}
                  <Switch
                    id={`feat_${f}`}
                    checked={isOn || locked}
                    disabled={pending || locked}
                    onCheckedChange={(v) => onToggle(f, v)}
                  />
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick message + decisions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-hajr-deep-navy">{t("adminActionsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={t("adminMessagePlaceholder")}
            className="w-full rounded-lg border border-hajr-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hajr-rose/40"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onSendMessage} disabled={pending || !message.trim()}>
              <Send className="me-1.5 h-4 w-4" />
              {t("adminSendMessage")}
            </Button>
            <Button variant="cta" size="sm" onClick={onConvert} disabled={pending || isReadOnly}>
              <GraduationCap className="me-1.5 h-4 w-4" />
              {t("adminConvert")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={pending || isReadOnly}
              className="text-hajr-error hover:bg-hajr-error/10 hover:text-hajr-error"
            >
              <UserX className="me-1.5 h-4 w-4" />
              {t("adminClose")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("adminActionsHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
