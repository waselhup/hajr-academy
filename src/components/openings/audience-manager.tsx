"use client";

/**
 * Admin AUDIENCE manager for a single program opening.
 *
 * Lets Abu Abdullah control WHO sees this opening: pick an audience type, and for
 * SELECTED_TEACHERS choose teachers via the reusable filter picker. For the
 * phased INTERNAL_THEN_APPLICANTS audience it shows the current phase and an
 * explicit "open to external applicants" button (confirm dialog) — the system
 * never auto-opens phase 2. A "preview audience" reveals the exact named list
 * (transparency, no black-box numbers), and re-targeting only notifies newcomers.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Users, Megaphone, Eye, Send, Lightbulb, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TeacherFilterPicker } from "@/components/teacher/teacher-filter-picker";
import type { TeacherFilter } from "@/lib/openings/service";
import {
  setOpeningAudienceAction,
  openApplicantsPhaseAction,
  previewOpeningAudienceAction,
} from "@/app/[locale]/(app)/admin/_actions/openings";

type AudienceType =
  | "SELECTED_TEACHERS"
  | "ALL_INTERNAL"
  | "APPLICANTS_ONLY"
  | "INTERNAL_THEN_APPLICANTS"
  | "EVERYONE";

export interface AudienceManagerProps {
  openingId: string;
  openingStatus: "OPEN" | "CLOSED" | "FILLED";
  audienceType: AudienceType;
  applicantsPhaseOpen: boolean;
  specializationOptions: string[];
  initialSelectedTeacherIds: string[];
  initialFilter: TeacherFilter;
  /** Live counts the page resolved server-side (internal invited / applied / selected). */
  counts: {
    internalInvited: number;
    applicantsReached: number;
    applied: number;
    selected: number;
  };
  /** Whether all internal applications are decided with none selected (phase-2 hint). */
  suggestOpenApplicants: boolean;
}

type PreviewData = Awaited<ReturnType<typeof previewOpeningAudienceAction>>;

const AUDIENCE_ORDER: AudienceType[] = [
  "ALL_INTERNAL",
  "SELECTED_TEACHERS",
  "INTERNAL_THEN_APPLICANTS",
  "APPLICANTS_ONLY",
  "EVERYONE",
];

export function AudienceManager(props: AudienceManagerProps) {
  const t = useTranslations("Openings");
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const [type, setType] = useState<AudienceType>(props.audienceType);
  const [selected, setSelected] = useState<string[]>(props.initialSelectedTeacherIds);
  const [filter, setFilter] = useState<TeacherFilter>(props.initialFilter);
  const [isSaving, startSave] = useTransition();
  const [phaseConfirm, setPhaseConfirm] = useState(false);
  const [isPhasing, startPhase] = useTransition();

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPreviewing, startPreview] = useTransition();

  const isClosed = props.openingStatus !== "OPEN";

  const save = () => {
    if (type === "SELECTED_TEACHERS" && selected.length === 0) {
      toast.error(t("audienceNoTeachers"));
      return;
    }
    startSave(async () => {
      const res = await setOpeningAudienceAction({
        openingId: props.openingId,
        audienceType: type,
        teacherIds: type === "SELECTED_TEACHERS" ? selected : undefined,
        filter: type === "SELECTED_TEACHERS" ? filter : undefined,
      });
      if (!res.ok) {
        toast.error(
          res.error === "NO_TEACHERS_SELECTED" ? t("audienceNoTeachers") : t("audienceSaveError")
        );
        return;
      }
      toast.success(t("audienceSaved"));
      router.refresh();
    });
  };

  const doPreview = () => {
    startPreview(async () => {
      const res = await previewOpeningAudienceAction(props.openingId);
      setPreview(res);
      setPreviewOpen(true);
    });
  };

  const openPhase2 = () => {
    startPhase(async () => {
      const res = await openApplicantsPhaseAction(props.openingId);
      setPhaseConfirm(false);
      if (!res.ok) {
        toast.error(t("audienceSaveError"));
        return;
      }
      toast.success(t("phase2Opened"));
      router.refresh();
    });
  };

  const typeLabel = (a: AudienceType) => t(`audienceType_${a}`);
  const typeHint = (a: AudienceType) => t(`audienceHint_${a}`);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg text-hajr-deep-navy">
          <Megaphone className="h-5 w-5 text-hajr-rose" />
          {t("audienceTitle")}
        </CardTitle>
        <CardDescription>{t("audienceSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Live counts — no black-box numbers. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t("countInternalInvited")} value={props.counts.internalInvited} />
          <Stat label={t("countApplicantsReached")} value={props.counts.applicantsReached} />
          <Stat label={t("countApplied")} value={props.counts.applied} />
          <Stat label={t("countSelected")} value={props.counts.selected} />
        </div>

        {/* Internal-first fairness note (recommended default). */}
        <div className="flex items-start gap-2 rounded-md border border-hajr-border bg-hajr-surface p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-hajr-success" />
          <span>{t("fairnessNote")}</span>
        </div>

        {/* Phase-2 gentle suggestion (admin decides; never automatic). */}
        {props.suggestOpenApplicants && type === "INTERNAL_THEN_APPLICANTS" && !props.applicantsPhaseOpen && (
          <div className="flex items-start gap-2 rounded-md border border-hajr-warning/40 bg-hajr-warning/5 p-3 text-sm text-hajr-deep-navy">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-hajr-warning" />
            <span>{t("phase2Suggestion")}</span>
          </div>
        )}

        {isClosed ? (
          <div className="rounded-md border border-hajr-border p-4 text-sm text-muted-foreground">
            {t("audienceClosedNote")}
          </div>
        ) : (
          <>
            {/* Audience type chooser. */}
            <div className="space-y-2">
              {AUDIENCE_ORDER.map((a) => {
                const on = type === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setType(a)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-start transition ${
                      on
                        ? "border-hajr-rose bg-hajr-rose/5"
                        : "border-hajr-border hover:border-hajr-rose/40"
                    }`}
                    dir={isAr ? "rtl" : "ltr"}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        on ? "border-hajr-rose" : "border-hajr-gray-300"
                      }`}
                    >
                      {on && <span className="h-2 w-2 rounded-full bg-hajr-rose" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium text-hajr-deep-navy">
                        {typeLabel(a)}
                        {a === "INTERNAL_THEN_APPLICANTS" && (
                          <Badge variant="navy">{t("recommendedTag")}</Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{typeHint(a)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SELECTED_TEACHERS → the reusable filter picker. */}
            {type === "SELECTED_TEACHERS" && (
              <div className="rounded-lg border border-hajr-border p-3">
                <TeacherFilterPicker
                  specializationOptions={props.specializationOptions}
                  initialSelected={selected}
                  initialFilter={filter}
                  onChange={(ids, f) => {
                    setSelected(ids);
                    setFilter(f);
                  }}
                />
              </div>
            )}

            {/* Actions. */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="cta" onClick={save} disabled={isSaving}>
                {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
                {t("audienceSave")}
              </Button>
              <Button variant="outline" onClick={doPreview} disabled={isPreviewing}>
                {isPreviewing ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Eye className="me-2 h-4 w-4" />}
                {t("previewAudience")}
              </Button>
              {props.audienceType === "INTERNAL_THEN_APPLICANTS" && !props.applicantsPhaseOpen && (
                <Button variant="secondary" onClick={() => setPhaseConfirm(true)} disabled={isPhasing}>
                  <Users className="me-2 h-4 w-4" />
                  {t("openApplicantsPhase")}
                </Button>
              )}
              {props.applicantsPhaseOpen && (
                <Badge variant="success" className="gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t("phase2Active")}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Phase-2 confirm. */}
      <AlertDialog open={phaseConfirm} onOpenChange={setPhaseConfirm}>
        <AlertDialogContent dir={isAr ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("openApplicantsPhase")}</AlertDialogTitle>
            <AlertDialogDescription>{t("phase2ConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={openPhase2} disabled={isPhasing}>
              {isPhasing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("phase2ConfirmCta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview audience (named list). */}
      <AlertDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <AlertDialogContent dir={isAr ? "rtl" : "ltr"} className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("previewAudienceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("previewAudienceBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          {preview && preview.ok ? (
            <div className="space-y-4 text-sm">
              <PreviewList
                heading={`${t("previewTeachers")} (${preview.data.teachers.length})`}
                empty={t("previewNone")}
                rows={preview.data.teachers}
              />
              <PreviewList
                heading={`${t("previewApplicants")} (${preview.data.applicants.length})`}
                empty={preview.data.applicants.length === 0 ? t("previewApplicantsPhase1") : t("previewNone")}
                rows={preview.data.applicants}
              />
              {preview.data.teachers.length === 0 && preview.data.applicants.length === 0 && (
                <div className="rounded-md border border-hajr-warning/40 bg-hajr-warning/5 p-3 text-xs text-hajr-deep-navy">
                  {t("previewZeroWarning")}
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 text-sm text-hajr-error">{t("loadError")}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("close")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-hajr-border p-2.5 text-center">
      <div className="text-lg font-bold text-hajr-deep-navy num">{value}</div>
      <div className="text-[11px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}

function PreviewList({
  heading,
  empty,
  rows,
}: {
  heading: string;
  empty: string;
  rows: { userId: string; name: string; email: string }[];
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{heading}</div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-hajr-border p-2 text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.userId} className="flex items-center justify-between gap-2 rounded border border-hajr-border px-2 py-1">
              <span className="truncate font-medium text-hajr-deep-navy">{r.name}</span>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">{r.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
