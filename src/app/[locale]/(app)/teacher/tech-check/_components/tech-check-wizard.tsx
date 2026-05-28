"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Gauge,
  Mic,
  Camera,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

type Step = "intro" | "speed" | "mic" | "camera" | "latency" | "summary";

type Result = {
  downloadMbps: number;
  uploadMbps: number;
  audioPeakDb: number;
  cameraOk: boolean;
  micOk: boolean;
  latencyMs: number;
};

type SaveRes = { ok: boolean; passed?: boolean; score?: number; failures?: string[] };

const PASS = {
  downloadMbps: 5,
  uploadMbps: 1,
  latencyMs: 200,
  audioPeakDb: -30,
};

export function TechCheckWizard({
  returnTo,
  lastSummary,
}: {
  returnTo: string | null;
  lastSummary: Awaited<ReturnType<
    typeof import("@/lib/teacher/tech-check-gate").getLastTechCheckSummary
  >>;
}) {
  const t = useTranslations("TechCheck");
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>({
    downloadMbps: 0,
    uploadMbps: 0,
    audioPeakDb: -100,
    cameraOk: false,
    micOk: false,
    latencyMs: 0,
  });
  const [save, setSave] = useState<SaveRes | null>(null);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopMedia() {
    try {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    } catch {}
    try {
      audioCtxRef.current?.close();
    } catch {}
    streamRef.current = null;
    audioCtxRef.current = null;
  }
  useEffect(() => stopMedia, []);

  /* ------------------------- SPEED ------------------------- */
  async function runSpeed() {
    setBusy(true);
    try {
      // Download — fetch 5 MB blob, measure
      const t0 = performance.now();
      const r = await fetch("/api/tech-check/speed-blob?cb=" + Date.now(), {
        cache: "no-store",
      });
      const buf = await r.arrayBuffer();
      const t1 = performance.now();
      const dlSec = (t1 - t0) / 1000;
      const dlMbps = (buf.byteLength * 8) / 1_000_000 / Math.max(0.001, dlSec);

      // Upload — POST 1 MB random payload to the same endpoint shape
      const upBuf = new Uint8Array(1024 * 1024);
      for (let i = 0; i < upBuf.length; i++) upBuf[i] = i & 0xff;
      const t2 = performance.now();
      await fetch("/api/tech-check/save?probe=upload", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: upBuf,
      }).catch(() => null);
      const t3 = performance.now();
      const upSec = (t3 - t2) / 1000;
      const upMbps = (upBuf.byteLength * 8) / 1_000_000 / Math.max(0.001, upSec);

      setResult((r) => ({
        ...r,
        downloadMbps: Math.round(dlMbps * 100) / 100,
        uploadMbps: Math.round(upMbps * 100) / 100,
      }));
      setStep("mic");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------- MIC ------------------------- */
  async function runMic() {
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let peak = -100;
      const end = Date.now() + 3000;
      while (Date.now() < end) {
        analyser.getByteTimeDomainData(data);
        let max = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128);
          if (v > max) max = v;
        }
        if (max > 0) {
          const norm = max / 128;
          const db = 20 * Math.log10(norm);
          if (db > peak) peak = db;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      stopMedia();
      setResult((r) => ({
        ...r,
        audioPeakDb: Math.round(peak * 10) / 10,
        micOk: peak > -60,
      }));
      setStep("camera");
    } catch {
      setResult((r) => ({ ...r, micOk: false, audioPeakDb: -100 }));
      setStep("camera");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------- CAMERA ------------------------- */
  async function startCamera() {
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoEl.current) {
        videoEl.current.srcObject = stream;
        await videoEl.current.play().catch(() => {});
      }
      setResult((r) => ({ ...r, cameraOk: true }));
    } catch {
      setResult((r) => ({ ...r, cameraOk: false }));
    } finally {
      setBusy(false);
    }
  }
  function confirmCamera() {
    stopMedia();
    setStep("latency");
  }

  /* ------------------------- LATENCY ------------------------- */
  async function runLatency() {
    setBusy(true);
    try {
      const samples: number[] = [];
      for (let i = 0; i < 10; i++) {
        const t0 = performance.now();
        await fetch("/api/tech-check/ping?cb=" + Math.random(), { cache: "no-store" }).catch(
          () => null
        );
        samples.push(performance.now() - t0);
      }
      samples.sort((a, b) => a - b);
      // trim min+max to dampen outliers
      const trimmed = samples.slice(1, -1);
      const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      const ms = Math.max(1, Math.round(avg));
      setResult((r) => ({ ...r, latencyMs: ms }));
      await saveAll({ ...result, latencyMs: ms });
      setStep("summary");
    } finally {
      setBusy(false);
    }
  }

  async function saveAll(r: Result) {
    try {
      const res = await fetch("/api/tech-check/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      });
      const j: SaveRes = await res.json();
      setSave(j);
    } catch {
      setSave({ ok: false });
    }
  }

  function reset() {
    setResult({
      downloadMbps: 0,
      uploadMbps: 0,
      audioPeakDb: -100,
      cameraOk: false,
      micOk: false,
      latencyMs: 0,
    });
    setSave(null);
    setStep("speed");
  }

  function StepBadge({ idx, label, active }: { idx: number; label: string; active: boolean }) {
    return (
      <div className={`flex items-center gap-2 ${active ? "text-hajr-rose" : "text-hajr-gray-400"}`}>
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
            active ? "border-hajr-rose bg-hajr-rose text-white" : "border-hajr-gray-300"
          }`}
        >
          {idx}
        </div>
        <span className="text-xs">{label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lastSummary && step === "intro" && (
        <Card>
          <CardContent className="flex items-center justify-between p-4 text-sm">
            <div>
              <div className="text-hajr-gray-500">{t("lastRun")}</div>
              <div className="font-semibold">
                {new Date(lastSummary.createdAt).toLocaleString()} · {lastSummary.ageMinutes} {t("minAgo")}
              </div>
            </div>
            <Badge variant={lastSummary.passed ? "success" : "danger"}>
              {lastSummary.passed ? t("passed") : t("failed")} ({lastSummary.score})
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StepBadge idx={1} label={t("step1")} active={step === "speed" || step === "intro"} />
            <StepBadge idx={2} label={t("step2")} active={step === "mic"} />
            <StepBadge idx={3} label={t("step3")} active={step === "camera"} />
            <StepBadge idx={4} label={t("step4")} active={step === "latency"} />
          </div>

          {step === "intro" && (
            <div className="space-y-4">
              <p className="text-sm text-hajr-gray-600">{t("introBlurb")}</p>
              <ul className="ms-4 list-disc text-sm text-hajr-gray-600">
                <li>{t("introList1")}</li>
                <li>{t("introList2")}</li>
                <li>{t("introList3")}</li>
                <li>{t("introList4")}</li>
              </ul>
              <Button
                onClick={() => setStep("speed")}
                className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
                data-testid="techcheck-start"
              >
                {t("startCheck")}
              </Button>
            </div>
          )}

          {step === "speed" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Gauge className="h-5 w-5 text-hajr-rose" /> {t("speedTitle")}
              </div>
              <p className="text-sm text-hajr-gray-600">{t("speedBlurb")}</p>
              {busy ? (
                <div className="flex items-center gap-2 text-hajr-rose">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("running")}
                </div>
              ) : (
                <Button onClick={runSpeed} className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
                  {t("runSpeed")}
                </Button>
              )}
            </div>
          )}

          {step === "mic" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Mic className="h-5 w-5 text-hajr-rose" /> {t("micTitle")}
              </div>
              <p className="text-sm text-hajr-gray-600">{t("micBlurb")}</p>
              {busy ? (
                <div className="flex items-center gap-2 text-hajr-rose">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("speakNow")}
                </div>
              ) : (
                <Button onClick={runMic} className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
                  {t("startMic")}
                </Button>
              )}
            </div>
          )}

          {step === "camera" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Camera className="h-5 w-5 text-hajr-rose" /> {t("cameraTitle")}
              </div>
              <p className="text-sm text-hajr-gray-600">{t("cameraBlurb")}</p>
              <video
                ref={videoEl}
                muted
                playsInline
                className="aspect-video w-full max-w-md rounded-md bg-black object-cover"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={startCamera} disabled={busy} variant="outline">
                  {t("startCamera")}
                </Button>
                <Button
                  onClick={confirmCamera}
                  disabled={!result.cameraOk}
                  className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
                >
                  {t("canSeeMyself")}
                </Button>
              </div>
            </div>
          )}

          {step === "latency" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Activity className="h-5 w-5 text-hajr-rose" /> {t("latencyTitle")}
              </div>
              <p className="text-sm text-hajr-gray-600">{t("latencyBlurb")}</p>
              {busy ? (
                <Progress value={70} />
              ) : (
                <Button onClick={runLatency} className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
                  {t("runLatency")}
                </Button>
              )}
            </div>
          )}

          {step === "summary" && save && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xl font-bold">
                {save.passed ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-hajr-mint" />
                    <span className="text-hajr-mint">{t("passed")} — {save.score}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-500" />
                    <span className="text-red-500">{t("failed")} — {save.score}</span>
                  </>
                )}
              </div>
              <ResultsTable result={result} />
              {save.passed ? (
                <div className="flex gap-2">
                  {returnTo && (
                    <Button
                      onClick={() => router.push(returnTo)}
                      className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
                    >
                      {t("continueToClass")}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => router.push("/teacher")}>{t("goToDashboard")}</Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm">
                  <div className="font-semibold text-red-700">{t("howToFix")}</div>
                  <ul className="ms-4 list-disc text-red-700">
                    {(save.failures ?? []).map((f) => (
                      <li key={f}>{t(`fix_${f}` as never)}</li>
                    ))}
                  </ul>
                  <Button onClick={reset} variant="outline">
                    {t("tryAgain")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultsTable({ result }: { result: Result }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
      <Item label="Download" value={`${result.downloadMbps} Mbps`} ok={result.downloadMbps >= PASS.downloadMbps} />
      <Item label="Upload" value={`${result.uploadMbps} Mbps`} ok={result.uploadMbps >= PASS.uploadMbps} />
      <Item label="Latency" value={`${result.latencyMs} ms`} ok={result.latencyMs > 0 && result.latencyMs < PASS.latencyMs} />
      <Item label="Audio peak" value={`${result.audioPeakDb} dB`} ok={result.audioPeakDb > PASS.audioPeakDb} />
      <Item label="Camera" value={result.cameraOk ? "OK" : "—"} ok={result.cameraOk} />
      <Item label="Mic" value={result.micOk ? "OK" : "—"} ok={result.micOk} />
    </div>
  );
}

function Item({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-hajr-gray-200 px-3 py-2">
      <span className="text-hajr-gray-500">{label}</span>
      <span className={`font-semibold ${ok ? "text-hajr-mint" : "text-red-500"}`}>{value}</span>
    </div>
  );
}
