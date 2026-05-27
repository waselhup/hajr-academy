"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

type Props = { variantSlug: string; testId: string };

export function StartForm({ variantSlug, testId }: Props) {
  const t = useTranslations("Placement");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ar";
  const [form, setForm] = useState({ guestName: "", guestEmail: "", guestPhone: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const variantParam =
        variantSlug === "general"
          ? "GENERAL_ENGLISH"
          : variantSlug === "step"
          ? "STEP_PREP"
          : "IELTS_PREP";
      const res = await fetch(`/api/placement-tests/${variantParam}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Failed");
      }
      const j = (await res.json()) as { attemptId: string; sessionId: string };
      try { sessionStorage.setItem(`hajr_attempt_${j.attemptId}`, j.sessionId); } catch {}
      router.push(`/${locale}/placement-test/take/${j.attemptId}?sid=${encodeURIComponent(j.sessionId)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={start} className="space-y-3 rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold text-hajr-text">{t("startTest")}</h2>

      <div>
        <label htmlFor="g-name" className="mb-1 block text-xs text-hajr-muted">{t("guestName")}</label>
        <input
          id="g-name"
          required
          value={form.guestName}
          onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm focus:border-hajr-rose focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="g-email" className="mb-1 block text-xs text-hajr-muted">{t("guestEmail")}</label>
        <input
          id="g-email"
          type="email"
          required
          value={form.guestEmail}
          onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm focus:border-hajr-rose focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="g-phone" className="mb-1 block text-xs text-hajr-muted">{t("guestPhone")}</label>
        <input
          id="g-phone"
          type="tel"
          value={form.guestPhone}
          onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm focus:border-hajr-rose focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-lg bg-hajr-rose px-4 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "…" : t("startTest")}
      </button>
      {err && <p className="text-xs text-hajr-error">{err}</p>}
    </form>
  );
}
