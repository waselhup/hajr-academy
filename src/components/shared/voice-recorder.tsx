"use client";

/**
 * Shared in-browser recorder (voice + optional video) — a minimal, dependency-free
 * capture widget built on the SAME proven getUserMedia / MediaRecorder / auto-stop /
 * re-record-preview pattern used by the assignments attachment composer
 * (src/components/assignments/attachment-composer.tsx Recorder).
 *
 * It is intentionally self-contained so it can be dropped next to any composer
 * (e.g. the chat composer) without coupling to assignment-specific logic. On a
 * confirmed take it calls `onCaptured(blob, durationSec)`; the caller decides
 * how to upload/attach it.
 *
 * - Graceful mic/camera-denied fallback (toast + inline notice).
 * - Live camera preview while recording video.
 * - Auto-stop at `maxSeconds`.
 * - RTL-safe (logical `me-*` spacing, no left/right hardcoding).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mic, Video, Square, RotateCcw, Info, Send, Loader2 } from "lucide-react";

export function VoiceRecorder({
  mode = "voice",
  maxSeconds = 3 * 60,
  disabled,
  busy,
  onCaptured,
  onCancel,
}: {
  mode?: "voice" | "video";
  maxSeconds?: number;
  disabled?: boolean;
  /** Show a spinner on the confirm button while the parent uploads. */
  busy?: boolean;
  onCaptured: (blob: Blob, durationSec: number) => void | Promise<void>;
  /** Optional: invoked when the user backs out before confirming a take. */
  onCancel?: () => void;
}) {
  const t = useTranslations("Messages");
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
      toast.error(t("micDenied"));
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
      toast.error(t("micDenied"));
    }
  }, [mode, maxSeconds, previewUrl, stop, t]);

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

  const cancel = useCallback(() => {
    clearTimer();
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    mrRef.current = null;
    reset();
    setRecording(false);
    onCancel?.();
  }, [clearTimer, reset, onCancel]);

  const Icon = mode === "video" ? Video : Mic;

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-hajr-border bg-white p-2.5 text-xs text-hajr-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-hajr-rose" />
        <span className="flex-1">{t("micDenied")}</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={cancel}>
          {t("cancel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {!recording && !previewUrl && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={start} disabled={disabled}>
            <Icon className="me-2 h-4 w-4" />
            {mode === "video" ? t("recordVideo") : t("recordVoice")}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={disabled}>
              {t("cancel")}
            </Button>
          )}
        </div>
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
            <span className="ms-1 flex h-2.5 w-2.5 animate-pulse rounded-full bg-hajr-rose" aria-hidden />
          </div>
        </div>
      )}

      {/* Re-record / confirm preview before committing the take. */}
      {!recording && previewUrl && (
        <div className="space-y-2 rounded-md border border-hajr-border bg-muted/20 p-2.5">
          {mode === "video" ? (
            <video controls className="w-full rounded-md" src={previewUrl} />
          ) : (
            <audio controls className="w-full" src={previewUrl} />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="cta" size="sm" onClick={useTake} disabled={disabled || busy}>
              {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4 rtl-flip" />}
              {t("useRecording")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={reset} disabled={disabled || busy}>
              <RotateCcw className="me-2 h-4 w-4" />
              {t("reRecord")}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={disabled || busy}>
                {t("cancel")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
