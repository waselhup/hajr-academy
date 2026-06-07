"use client";

/**
 * Shared attachment composer — record VIDEO / record VOICE / type TEXT / upload
 * FILES, with native drag-and-drop + progress, client-side caps, graceful
 * mic/camera-denied fallback, and re-record-before-submit. Used by both the
 * teacher create-assignment form and the student submission composer.
 *
 * Each captured/uploaded item is POSTed to /api/assignments/upload immediately
 * and the returned storage path is held in state; the parent reads the staged
 * list via `value`/`onChange` and persists it through a server action.
 *
 * `allowedKinds` controls which capture options are offered (the student form
 * passes the assignment's allowedResponseTypes; the teacher form passes all).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  Video,
  Square,
  RotateCcw,
  Upload,
  Loader2,
  X,
  FileText,
  Film,
  Info,
  Link2,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AttachmentKind = "VIDEO" | "AUDIO" | "TEXT" | "FILE" | "LINK";

/** True for a well-formed http(s) URL (mirrors the server-side check). */
function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface StagedAttachment {
  kind: AttachmentKind;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number | null;
  /** Local-only id for list keys + removal. */
  localId: string;
}

const MAX_VIDEO_SEC = 5 * 60;
const MAX_VOICE_SEC = 3 * 60;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let localCounter = 0;
const nextLocalId = () => `local-${++localCounter}`;

export function AttachmentComposer({
  allowedKinds,
  value,
  onChange,
  disabled,
}: {
  allowedKinds: AttachmentKind[];
  value: StagedAttachment[];
  onChange: (next: StagedAttachment[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Assignments");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState(false);

  const canVideo = allowedKinds.includes("VIDEO");
  const canAudio = allowedKinds.includes("AUDIO");
  const canFile = allowedKinds.includes("FILE");
  const canLink = allowedKinds.includes("LINK");

  // Stage an external link (no upload — the URL itself is the stored value).
  const addLink = useCallback(() => {
    const url = linkValue.trim();
    if (!isHttpUrl(url)) {
      setLinkError(true);
      return;
    }
    setLinkError(false);
    onChange([
      ...value,
      {
        kind: "LINK",
        path: url,
        fileName: url,
        mimeType: "text/uri-list",
        sizeBytes: 0,
        durationSec: null,
        localId: nextLocalId(),
      },
    ]);
    setLinkValue("");
  }, [linkValue, value, onChange]);

  // ── Upload helper (XHR for progress) ─────────────────────────────
  const uploadBlob = useCallback(
    (blob: Blob, fileName: string, kind: AttachmentKind | null, durationSec?: number): Promise<StagedAttachment | null> => {
      return new Promise((resolve) => {
        const fd = new FormData();
        fd.append("file", blob, fileName);
        if (kind) fd.append("kind", kind);
        if (durationSec != null) fd.append("durationSec", String(durationSec));

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/assignments/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          setProgress(null);
          try {
            const data = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && data.attachment) {
              const a = data.attachment;
              resolve({
                kind: a.kind,
                path: a.path,
                fileName: a.fileName,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                durationSec: a.durationSec ?? null,
                localId: nextLocalId(),
              });
            } else {
              toast.error(data.error ?? t("uploadError"));
              resolve(null);
            }
          } catch {
            toast.error(t("uploadError"));
            resolve(null);
          }
        };
        xhr.onerror = () => {
          setProgress(null);
          toast.error(t("uploadError"));
          resolve(null);
        };
        xhr.send(fd);
      });
    },
    [t]
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setUploading(true);
      try {
        for (const f of list) {
          // Classify by MIME for the kind hint (server re-validates by bytes).
          const kind: AttachmentKind = f.type.startsWith("video/")
            ? "VIDEO"
            : f.type.startsWith("audio/")
            ? "AUDIO"
            : "FILE";
          // Skip kinds the assignment doesn't allow (student side).
          if (kind === "VIDEO" && !canVideo) { toast.error(t("kindNotAllowed")); continue; }
          if (kind === "AUDIO" && !canAudio) { toast.error(t("kindNotAllowed")); continue; }
          if (kind === "FILE" && !canFile) { toast.error(t("kindNotAllowed")); continue; }
          const staged = await uploadBlob(f, f.name, kind);
          if (staged) onChange([...value, staged]);
        }
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [uploadBlob, value, onChange, canVideo, canAudio, canFile, t]
  );

  const removeAt = useCallback(
    (localId: string) => onChange(value.filter((a) => a.localId !== localId)),
    [value, onChange]
  );

  // ── Drag and drop ────────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled, uploading]
  );

  return (
    <div className="space-y-3">
      {/* Recorders */}
      <div className="flex flex-wrap gap-2">
        {canVideo && (
          <Recorder
            mode="video"
            maxSeconds={MAX_VIDEO_SEC}
            disabled={disabled || uploading}
            onCaptured={async (blob, sec) => {
              const staged = await uploadBlob(blob, `recording.webm`, "VIDEO", sec);
              if (staged) onChange([...value, staged]);
            }}
          />
        )}
        {canAudio && (
          <Recorder
            mode="voice"
            maxSeconds={MAX_VOICE_SEC}
            disabled={disabled || uploading}
            onCaptured={async (blob, sec) => {
              const staged = await uploadBlob(blob, `voice.webm`, "AUDIO", sec);
              if (staged) onChange([...value, staged]);
            }}
          />
        )}
      </div>

      {/* Drag-and-drop upload zone */}
      {canFile || canVideo || canAudio ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-lg border-2 border-dashed p-4 text-center transition-colors",
            dragOver ? "border-hajr-rose bg-hajr-rose/5" : "border-hajr-border bg-muted/20"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <Upload className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t("dropHint")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
            {t("chooseFiles")}
          </Button>
        </div>
      ) : null}

      {/* External link */}
      {canLink && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                inputMode="url"
                dir="ltr"
                value={linkValue}
                disabled={disabled || uploading}
                placeholder={t("linkPlaceholder")}
                aria-label={t("linkUrl")}
                className="ps-9"
                onChange={(e) => {
                  setLinkValue(e.target.value);
                  if (linkError) setLinkError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading || !linkValue.trim()}
              onClick={addLink}
            >
              <Plus className="me-1.5 h-4 w-4" />
              {t("linkAdd")}
            </Button>
          </div>
          {linkError && <p className="text-xs text-destructive">{t("linkInvalid")}</p>}
        </div>
      )}

      {/* Upload progress */}
      {progress != null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-hajr-rose transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Staged list */}
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((a) => (
            <li
              key={a.localId}
              className="flex items-center justify-between gap-2 rounded-md border bg-white p-2.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                {a.kind === "VIDEO" ? (
                  <Film className="h-4 w-4 shrink-0 text-hajr-rose" />
                ) : a.kind === "AUDIO" ? (
                  <Mic className="h-4 w-4 shrink-0 text-hajr-rose" />
                ) : a.kind === "LINK" ? (
                  <Link2 className="h-4 w-4 shrink-0 text-hajr-rose" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-hajr-rose" />
                )}
                <span className="truncate">{a.fileName}</span>
                {a.kind !== "LINK" && (
                  <span className="num text-xs text-muted-foreground">{humanSize(a.sizeBytes)}</span>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={disabled}
                onClick={() => removeAt(a.localId)}
                aria-label={t("remove")}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ──────────────────────── Recorder (video/voice) ────────────────────────

function Recorder({
  mode,
  maxSeconds,
  disabled,
  onCaptured,
}: {
  mode: "video" | "voice";
  maxSeconds: number;
  disabled?: boolean;
  onCaptured: (blob: Blob, durationSec: number) => void | Promise<void>;
}) {
  const t = useTranslations("Assignments");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    mrRef.current?.stop();
    setRecording(false);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    setError(false);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(true);
      return;
    }
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      blobRef.current = null;

      const constraints: MediaStreamConstraints =
        mode === "video" ? { video: true, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Live camera preview while recording video.
      if (mode === "video" && liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        await liveVideoRef.current.play().catch(() => {});
      }

      const mime = mode === "video" ? "video/webm" : "audio/webm";
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      };
      mr.start();
      mrRef.current = mr;
      setElapsed(0);
      elapsedRef.current = 0;
      setRecording(true);

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= maxSeconds) stop();
      }, 1000);
    } catch {
      setError(true);
      setRecording(false);
    }
  }, [mode, maxSeconds, previewUrl, stop]);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setElapsed(0);
  }, [previewUrl]);

  const useTake = useCallback(async () => {
    if (blobRef.current) {
      await onCaptured(blobRef.current, elapsedRef.current);
      reset();
    }
  }, [onCaptured, reset]);

  const Icon = mode === "video" ? Video : Mic;
  const label = mode === "video" ? t("recordVideo") : t("recordVoice");

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border bg-white p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-hajr-rose" />
        <span>{t("captureDenied")}</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {!recording && !previewUrl && (
        <Button type="button" variant="outline" size="sm" onClick={start} disabled={disabled}>
          <Icon className="me-2 h-4 w-4" />
          {label}
        </Button>
      )}

      {recording && (
        <div className="space-y-2">
          {mode === "video" && (
            <video ref={liveVideoRef} className="w-full rounded-md bg-black" playsInline muted />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={stop}>
              <Square className="me-2 h-4 w-4" />
              {t("stop")}
            </Button>
            <span className="num text-xs font-medium text-hajr-rose">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} / {Math.floor(maxSeconds / 60)}:00
            </span>
          </div>
        </div>
      )}

      {/* Re-record preview before committing the take. */}
      {!recording && previewUrl && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
          {mode === "video" ? (
            <video controls className="w-full rounded-md" src={previewUrl} />
          ) : (
            <audio controls className="w-full" src={previewUrl} />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="cta" size="sm" onClick={useTake} disabled={disabled}>
              {t("useRecording")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={reset} disabled={disabled}>
              <RotateCcw className="me-2 h-4 w-4" />
              {t("reRecord")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
