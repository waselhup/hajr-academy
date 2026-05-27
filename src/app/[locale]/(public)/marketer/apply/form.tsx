"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function MarketerApplyForm() {
  const t = useTranslations("Marketer");
  const [form, setForm] = useState({ name: "", email: "", phone: "", why: "", social: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/marketers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Failed");
      }
      setSuccess(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-hajr-mint bg-hajr-mint/10 p-8 text-center">
        <p className="text-lg font-medium text-hajr-deep-navy">{t("applySuccess")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-hajr-border bg-white p-6 shadow-card">
      <div>
        <label htmlFor="name" className="mb-1 block text-xs text-hajr-muted">{t("applyName")}</label>
        <input
          id="name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-hajr-muted">{t("applyEmail")}</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-xs text-hajr-muted">{t("applyPhone")}</label>
          <input
            id="phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="why" className="mb-1 block text-xs text-hajr-muted">{t("applyWhy")}</label>
        <textarea
          id="why"
          required
          rows={4}
          value={form.why}
          onChange={(e) => setForm((f) => ({ ...f, why: e.target.value }))}
          className="w-full rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="social" className="mb-1 block text-xs text-hajr-muted">{t("applySocial")}</label>
        <input
          id="social"
          value={form.social}
          onChange={(e) => setForm((f) => ({ ...f, social: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
          placeholder="@example"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-lg bg-hajr-rose px-4 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "…" : t("applySubmit")}
      </button>

      {err && <p className="text-xs text-hajr-error">{err}</p>}
    </form>
  );
}
