"use client";

/**
 * Shared in-browser recorder (voice + optional video) — a minimal, dependency-free
 * capture widget built on the SAME proven getUserMedia / MediaRecorder / auto-stop /
 * re-record-preview pattern used by the assignments attachment composer
 * (src/components/assignments/attachment-composer.tsx Recorder).
 *
 * It is intentionally self-contained so it can be dropped next to any composer
 * (e.g. the chat composer) without coupling to assignment-specific logic. On a
 * confirmed take it calls `onCaptured(blob, durationSec, mimeType)`; the caller
 * decides how to upload/attach it.
 *
 * - Graceful mic/camera-denied fallback (toast + inline notice).
 * - Live camera preview while recording video.
 * - Auto-stop at `maxSeconds`.
 * - RTL-safe (logical `me-*` spacing, no left/right hardcoding).
 *
 * Codec negotiation: NOT every browser records WebM. Chrome/Firefox emit
 * video/webm; Safari (desktop + iOS) only records video/mp4. We pick the first
 * MediaRecorder.isTypeSupported() candidate and report the REAL container mime
 * to the caller via onCaptured, so the upload labels + validates the bytes that
 * were actually captured (the old code hardcoded video/webm, so Safari takes
 * were mislabelled and the server rejected them — the "Unsupported file type" /
 * camera-doesn't-open class of bug).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mic, Video, Square, RotateCcw, Info, Send, Loader2 } from "lucide-react";
import { baseContainerMime, mimeCandidates } from "@/lib/media/recording-mime";

/**
 * First MediaRecorder mime the browser actually supports for this mode, with a
 * graceful empty-string fallback (lets the browser choose its own default).
 */
function pickSupportedMime(mode: "voice" | "video"): string {
  if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
    for (const c of mimeCandidates(mode)) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
  }
  return "";
}

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
  /**
   * Confirmed take. `mimeType` is the REAL container the browser produced
   * (e.g. "video/webm" or "video/mp4") so the caller can pick the right
   * extension + let the server validate the matching magic bytes.
   */
  onCaptured: (blob: Blob, durationSec: number, mimeType: string) => void | Promise<void>;
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
  // Real container mime of the confirmed take (set on MediaRecorder stop).
  const mimeRef = useRef<string>(mode === "video" ? "video/webm" : "audio/webm");
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

  // Attach the live camera stream to the <video> once it mounts. The live
  // preview element is only rendered while `recording` is true, so it does NOT
  // exist yet inside start() — wiring srcObject there silently no-ops and the
  // user sees a black/absent preview ("the camera doesn't open"). Doing it in an
  // effect keyed on `recording` guarantees the element is present first.
  useEffect(() => {
    if (mode !== "video" || !recording) return;
    const el = liveVideoRef.current;
    const stream = streamRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.muted = true;
    el.play().catch(() => {});
  }, [recording, mode]);

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
      // The live preview <video> is wired up by the `recording`-keyed effect
      // below (the element isn't mounted until setRecording(true) flushes).

      // Negotiate a container the browser can actually record (Safari ≠ WebM).
      const chosen = pickSupportedMime(mode);
      const mr = chosen
        ? new MediaRecorder(stream, { mimeType: chosen })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        // Prefer what the recorder reports it actually produced; fall back to
        // our chosen candidate, then to the mode's webm default.
        const real = baseContainerMime(mr.mimeType || chosen, mode);
        mimeRef.current = real;
        const blob = new Blob(chunksRef.current, { type: real });
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
      await onCaptured(blobRef.current, elapsedRef.current, mimeRef.current);
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
