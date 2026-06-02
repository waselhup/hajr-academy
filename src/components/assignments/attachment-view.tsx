"use client";

/**
 * Renders a single rich attachment (teacher material OR student submission).
 * The signed URL is fetched on demand from the access-controlled endpoint
 * (/api/assignments/attachment) so a leaked link can't be replayed — and the
 * server re-checks access on every fetch. Video/audio play inline, images
 * preview, everything else is a download button.
 */
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Film,
  Mic,
  ImageIcon,
  Download,
  Loader2,
  Play,
} from "lucide-react";

export type AttachmentKind = "VIDEO" | "AUDIO" | "TEXT" | "FILE";

export interface AttachmentVM {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number | null;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanDuration(sec: number | null): string | null {
  if (sec == null || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function KindIcon({ kind }: { kind: AttachmentKind }) {
  const cls = "h-4 w-4 shrink-0";
  if (kind === "VIDEO") return <Film className={cls} />;
  if (kind === "AUDIO") return <Mic className={cls} />;
  if (kind === "FILE") return <FileText className={cls} />;
  return <FileText className={cls} />;
}

export function AttachmentView({
  attachment,
  source,
}: {
  attachment: AttachmentVM;
  /** Which endpoint family + access rule applies. */
  source: "assignment" | "submission";
}) {
  const t = useTranslations("Assignments");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isImage = attachment.mimeType.startsWith("image/");

  const fetchUrl = useCallback(async (): Promise<string | null> => {
    if (url) return url;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assignments/attachment?type=${source}&id=${attachment.id}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(t("attachmentLoadError"));
        return null;
      }
      setUrl(data.url);
      return data.url as string;
    } catch {
      toast.error(t("attachmentLoadError"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, source, attachment.id, t]);

  const onDownload = useCallback(async () => {
    const u = await fetchUrl();
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  }, [fetchUrl]);

  const dur = humanDuration(attachment.durationSec);
  const meta = (
    <span className="num text-xs text-muted-foreground">
      {humanSize(attachment.sizeBytes)}
      {dur ? ` · ${dur}` : ""}
    </span>
  );

  // Inline players: lazily reveal the media element once the URL is fetched.
  if (attachment.kind === "VIDEO") {
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2">
          <KindIcon kind="VIDEO" />
          <span className="truncate text-sm font-medium">{attachment.fileName}</span>
          {meta}
        </div>
        {url ? (
          <video controls className="w-full rounded-md" src={url} preload="metadata" />
        ) : (
          <Button size="sm" variant="outline" onClick={fetchUrl} disabled={loading}>
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Play className="me-2 h-4 w-4" />}
            {t("playVideo")}
          </Button>
        )}
      </div>
    );
  }

  if (attachment.kind === "AUDIO") {
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2">
          <KindIcon kind="AUDIO" />
          <span className="truncate text-sm font-medium">{attachment.fileName}</span>
          {meta}
        </div>
        {url ? (
          <audio controls className="w-full" src={url} preload="metadata" />
        ) : (
          <Button size="sm" variant="outline" onClick={fetchUrl} disabled={loading}>
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Play className="me-2 h-4 w-4" />}
            {t("playAudio")}
          </Button>
        )}
      </div>
    );
  }

  // Image preview (a FILE that is an image).
  if (isImage) {
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-medium">{attachment.fileName}</span>
          {meta}
        </div>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={attachment.fileName} className="max-h-72 w-auto rounded-md" />
        ) : (
          <Button size="sm" variant="outline" onClick={fetchUrl} disabled={loading}>
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ImageIcon className="me-2 h-4 w-4" />}
            {t("previewImage")}
          </Button>
        )}
      </div>
    );
  }

  // Any other document → download button.
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <KindIcon kind="FILE" />
        <span className="truncate text-sm font-medium">{attachment.fileName}</span>
        {meta}
      </div>
      <Button size="sm" variant="outline" onClick={onDownload} disabled={loading}>
        {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Download className="me-2 h-4 w-4" />}
        {t("download")}
      </Button>
    </div>
  );
}

/** Render a list of attachments with an empty fallback. */
export function AttachmentList({
  attachments,
  source,
  emptyLabel,
}: {
  attachments: AttachmentVM[];
  source: "assignment" | "submission";
  emptyLabel?: string;
}) {
  if (attachments.length === 0) {
    return emptyLabel ? (
      <p className="text-xs text-muted-foreground">{emptyLabel}</p>
    ) : null;
  }
  return (
    <div className="space-y-2">
      {attachments.map((a) => (
        <AttachmentView key={a.id} attachment={a} source={source} />
      ))}
    </div>
  );
}
