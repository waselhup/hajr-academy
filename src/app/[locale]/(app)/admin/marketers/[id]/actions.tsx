"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  marketerId: string;
  currentStatus: "PENDING" | "ACTIVE" | "SUSPENDED";
  currentRate: number;
  locale: string;
};

export function MarketerActions({ marketerId, currentStatus, currentRate, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState(String(currentRate));
  const [err, setErr] = useState<string | null>(null);
  const isAr = locale === "ar";

  async function call(path: string, body: object) {
    setErr(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error || "Failed");
      return false;
    }
    return true;
  }

  function approve() {
    startTransition(async () => {
      const ok = await call(`/api/marketers/admin`, { id: marketerId, action: "APPROVE" });
      if (ok) router.refresh();
    });
  }
  function suspend() {
    startTransition(async () => {
      const ok = await call(`/api/marketers/admin`, { id: marketerId, action: "SUSPEND" });
      if (ok) router.refresh();
    });
  }
  function activate() {
    startTransition(async () => {
      const ok = await call(`/api/marketers/admin`, { id: marketerId, action: "ACTIVATE" });
      if (ok) router.refresh();
    });
  }
  function updateRate() {
    const newRate = parseFloat(rate);
    if (!Number.isFinite(newRate) || newRate < 0 || newRate > 1) {
      setErr(isAr ? "نسبة غير صالحة (0-1)" : "Invalid rate (0-1)");
      return;
    }
    startTransition(async () => {
      const ok = await call(`/api/marketers/admin`, {
        id: marketerId,
        action: "SET_RATE",
        rate: newRate,
      });
      if (ok) router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
      <h2 className="mb-3 text-base font-semibold text-hajr-text">{isAr ? "إجراءات" : "Actions"}</h2>
      <div className="flex flex-wrap gap-2">
        {currentStatus === "PENDING" && (
          <button
            onClick={approve}
            disabled={pending}
            className="h-10 rounded-lg bg-hajr-success px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {isAr ? "اعتماد" : "Approve"}
          </button>
        )}
        {currentStatus === "ACTIVE" && (
          <button
            onClick={suspend}
            disabled={pending}
            className="h-10 rounded-lg bg-hajr-error px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {isAr ? "إيقاف" : "Suspend"}
          </button>
        )}
        {currentStatus === "SUSPENDED" && (
          <button
            onClick={activate}
            disabled={pending}
            className="h-10 rounded-lg bg-hajr-deep-navy px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {isAr ? "إعادة تفعيل" : "Reactivate"}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="rate" className="mb-1 block text-xs text-hajr-muted">
            {isAr ? "نسبة العمولة (مثال: 0.10 = 10٪)" : "Commission rate (e.g. 0.10 = 10%)"}
          </label>
          <input
            id="rate"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-10 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm"
          />
        </div>
        <button
          onClick={updateRate}
          disabled={pending}
          className="h-10 rounded-lg bg-hajr-deep-navy px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {isAr ? "حفظ" : "Save"}
        </button>
      </div>

      {err && <p className="mt-2 text-xs text-hajr-error">{err}</p>}
    </section>
  );
}
