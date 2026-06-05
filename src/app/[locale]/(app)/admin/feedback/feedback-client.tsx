"use client";

/**
 * Admin feedback inbox client — lists public-survey responses, filters by
 * type / rating / consent / has-media, and opens a detail dialog with the full
 * text plus inline VOICE/VIDEO players. Media is private: the player fetches a
 * short-lived signed URL from /api/admin/feedback/media on demand (never
 * embedded in the list payload). Western digits via fmtRiyadh + the `num`
 * class; RTL-safe with logical spacing.
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Star, Mic, Video, GraduationCap, Users, ShieldCheck,
  Inbox, Phone, Link2, Check, Play,
} from "lucide-react";
import { fmtRiyadh } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Response {
  id: string;
  respondentType: "STUDENT" | "PARENT";
  teacherName: string;
  studentName: string | null;
  programOrClass: string | null;
  ratingOverall: number;
  qualityRating: number | null;
  commsRating: number | null;
  improved: "YES" | "SOME" | "NO" | null;
  recommendRating: number | null;
  likedMost: string | null;
  improveSuggestion: string | null;
  textTestimonial: string | null;
  hasVoice: boolean;
  hasVideo: boolean;
  mediaKind: "AUDIO" | "VIDEO" | null;
  respondentName: string | null;
  respondentContact: string | null;
  consentTestimonial: boolean;
  consentContact: boolean;
  locale: string;
  createdAt: string;
}

const RATING_FILTERS = [0, 5, 4, 3] as const;

export function FeedbackClient() {
  const t = useTranslations("AdminFeedback");

  const [rows, setRows] = useState<Response[]>([]);
  const [total, setTotal] = useState(0);
  const [avg, setAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const [type, setType] = useState<"" | "STUDENT" | "PARENT">("");
  const [minRating, setMinRating] = useState(0);
  const [consentOnly, setConsentOnly] = useState(false);
  const [mediaOnly, setMediaOnly] = useState(false);

  const [active, setActive] = useState<Response | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrored(false);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (minRating) params.set("minRating", String(minRating));
      if (consentOnly) params.set("consent", "1");
      if (mediaOnly) params.set("media", "1");
      const res = await fetch(`/api/admin/feedback?${params}`);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setRows(data.responses ?? []);
      setTotal(data.total ?? 0);
      setAvg(data.avgOverall ?? null);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [type, minRating, consentOnly, mediaOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  function copyLink() {
    const url = `${window.location.origin}/survey`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  return (
    <div className="space-y-4">
      {/* Public link + summary */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4 text-hajr-rose" />
          <span className="font-medium text-hajr-navy">{t("publicLink")}:</span>
          <code className="rounded bg-hajr-surface px-2 py-0.5 text-xs text-hajr-body" dir="ltr">/survey</code>
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-hajr-success" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? t("copied") : t("copyLink")}
          </Button>
        </div>
        {avg != null && total > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-hajr-muted">
            <Star className="h-4 w-4 fill-hajr-rose text-hajr-rose" />
            <span className="num font-semibold text-hajr-navy">{avg.toFixed(1)}</span>
            <span className="num">· {t("resultsCount", { n: total })}</span>
          </div>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={type === ""} onClick={() => setType("")}>{t("filterAll")}</FilterChip>
        <FilterChip active={type === "STUDENT"} onClick={() => setType("STUDENT")} icon={GraduationCap}>{t("student")}</FilterChip>
        <FilterChip active={type === "PARENT"} onClick={() => setType("PARENT")} icon={Users}>{t("parent")}</FilterChip>
        <span className="mx-1 h-5 w-px bg-hajr-border" />
        {RATING_FILTERS.map((r) => (
          <FilterChip key={r} active={minRating === r} onClick={() => setMinRating(r)}>
            {r === 0 ? t("anyRating") : <span className="num">{t("ratingPlus", { n: r })}</span>}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-hajr-border" />
        <FilterChip active={consentOnly} onClick={() => setConsentOnly((v) => !v)} icon={ShieldCheck}>{t("withConsent")}</FilterChip>
        <FilterChip active={mediaOnly} onClick={() => setMediaOnly((v) => !v)} icon={Play}>{t("withMedia")}</FilterChip>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-hajr-rose" />
        </div>
      ) : errored ? (
        <Card className="py-12 text-center text-sm text-hajr-muted">{t("errorLoad")}</Card>
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="h-10 w-10 text-hajr-light" />
          <p className="max-w-sm text-sm text-hajr-muted">{t("empty")}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <ResponseCard key={r.id} r={r} onOpen={() => setActive(r)} t={t} />
          ))}
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
          {active && <Detail r={active} t={t} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResponseCard({
  r,
  onOpen,
  t,
}: {
  r: Response;
  onOpen: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const TypeIcon = r.respondentType === "PARENT" ? Users : GraduationCap;
  return (
    <Card className="cursor-pointer p-4 transition hover:border-hajr-rose/40 hover:shadow-card-hover" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <TypeIcon className="h-3 w-3" />
              {r.respondentType === "PARENT" ? t("parent") : t("student")}
            </Badge>
            <Stars value={r.ratingOverall} size="sm" />
            {r.hasVideo && <Badge variant="outline" className="gap-1 text-hajr-rose"><Video className="h-3 w-3" />{t("video")}</Badge>}
            {r.hasVoice && <Badge variant="outline" className="gap-1 text-hajr-rose"><Mic className="h-3 w-3" />{t("voice")}</Badge>}
            {r.consentTestimonial && (
              <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" />{t("consentYes")}</Badge>
            )}
          </div>
          <p className="mt-2 truncate text-sm text-hajr-body">
            <span className="text-hajr-muted">{t("about")}:</span> <span className="font-medium text-hajr-navy">{r.teacherName}</span>
          </p>
          {(r.textTestimonial || r.likedMost) && (
            <p className="mt-1 line-clamp-2 text-sm text-hajr-muted">{r.textTestimonial || r.likedMost}</p>
          )}
        </div>
        <span className="num shrink-0 text-xs text-hajr-light">{fmtRiyadh(r.createdAt, "yyyy-MM-dd")}</span>
      </div>
    </Card>
  );
}

function Detail({ r, t }: { r: Response; t: ReturnType<typeof useTranslations> }) {
  const who = r.respondentType === "PARENT" ? t("parent") : t("student");
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {r.respondentType === "PARENT" ? <Users className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
          {who} · {r.teacherName}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-1">
        {/* Consent banner — make the permission status unmistakable. */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
            r.consentTestimonial ? "bg-hajr-mint/40 text-hajr-success" : "bg-hajr-surface text-hajr-muted",
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          {r.consentTestimonial ? t("consentYes") : t("consentNo")}
          {r.consentContact && <span className="ms-auto text-xs">· {t("contactOk")}</span>}
        </div>

        {/* Ratings grid */}
        <div className="grid grid-cols-2 gap-3">
          <RatingCell label={t("overall")} value={r.ratingOverall} />
          {r.qualityRating != null && <RatingCell label={t("quality")} value={r.qualityRating} />}
          {r.commsRating != null && <RatingCell label={t("comms")} value={r.commsRating} />}
          {r.recommendRating != null && <RatingCell label={t("recommend")} value={r.recommendRating} />}
        </div>
        {r.improved && (
          <div className="text-sm">
            <span className="text-hajr-muted">{t("improved")}:</span>{" "}
            <span className="font-medium text-hajr-navy">
              {t(r.improved === "YES" ? "improvedYes" : r.improved === "SOME" ? "improvedSome" : "improvedNo")}
            </span>
          </div>
        )}

        {/* Media players (signed on demand) */}
        {r.hasVideo && <MediaPlayer id={r.id} kind="video" label={t("video")} t={t} />}
        {r.hasVoice && <MediaPlayer id={r.id} kind="voice" label={t("voice")} t={t} />}

        {/* Text blocks */}
        {r.textTestimonial && <TextBlock label={t("testimonial")} value={r.textTestimonial} highlight />}
        {r.likedMost && <TextBlock label={t("likedMost")} value={r.likedMost} />}
        {r.improveSuggestion && <TextBlock label={t("toImprove")} value={r.improveSuggestion} />}

        {/* Meta */}
        <div className="space-y-1 border-t border-hajr-border pt-3 text-sm">
          {r.studentName && <Meta label={t("student")} value={r.studentName} />}
          {r.programOrClass && <Meta label={t("about")} value={r.programOrClass} />}
          <Meta label={t("by")} value={r.respondentName || t("anonymous")} />
          {r.respondentContact && (
            <div className="flex items-center gap-1.5 text-sm">
              <Phone className="h-3.5 w-3.5 text-hajr-muted" />
              <span className="num text-hajr-body" dir="ltr">{r.respondentContact}</span>
            </div>
          )}
          <span className="num block text-xs text-hajr-light">{fmtRiyadh(r.createdAt, "yyyy-MM-dd HH:mm")}</span>
        </div>
      </div>
    </>
  );
}

function MediaPlayer({
  id,
  kind,
  label,
  t,
}: {
  id: string;
  kind: "voice" | "video";
  label: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  async function loadUrl() {
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch(`/api/admin/feedback/media?id=${id}&kind=${kind}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUrl(data.url);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-hajr-border bg-hajr-surface/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-hajr-navy">
        {kind === "video" ? <Video className="h-4 w-4 text-hajr-rose" /> : <Mic className="h-4 w-4 text-hajr-rose" />}
        {label}
      </div>
      {url ? (
        kind === "video" ? (
          <video controls className="w-full rounded-md" src={url} />
        ) : (
          <audio controls className="w-full" src={url} />
        )
      ) : err ? (
        <p className="text-xs text-hajr-error">{t("mediaError")}</p>
      ) : (
        <Button variant="outline" size="sm" onClick={loadUrl} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {loading ? t("loadingMedia") : t("loadMedia")}
        </Button>
      )}
    </div>
  );
}

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(s, n <= value ? "fill-hajr-rose text-hajr-rose" : "fill-transparent text-hajr-border")} />
      ))}
    </span>
  );
}

function RatingCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-hajr-surface/60 p-2.5">
      <div className="text-xs text-hajr-muted">{label}</div>
      <div className="mt-1"><Stars value={value} size="sm" /></div>
    </div>
  );
}

function TextBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg p-3", highlight ? "bg-hajr-rose/5" : "bg-hajr-surface/60")}>
      <div className="mb-1 text-xs font-medium text-hajr-muted">{label}</div>
      <p className="whitespace-pre-wrap text-sm text-hajr-body">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-hajr-muted">{label}:</span> <span className="text-hajr-body">{value}</span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-hajr-rose bg-hajr-rose text-white"
          : "border-hajr-border bg-white text-hajr-navy hover:border-hajr-rose/50",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
