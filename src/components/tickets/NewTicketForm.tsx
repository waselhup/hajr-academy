"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function NewTicketForm({ locale }: { locale: string }) {
  const t = useTranslations("Tickets");
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        setLoading(false);
        return;
      }
      router.push(`/${locale}/tickets/${data.ticket.id}`);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-hajr-border bg-white p-6 shadow-sm">
      <div>
        <label className="mb-2 block text-sm font-medium text-hajr-text">
          {t("fieldSubject")}
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          placeholder={t("subjectPlaceholder")}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-hajr-text">
          {t("fieldBody")}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={5}
          maxLength={4000}
          rows={8}
          className="w-full rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          placeholder={t("bodyPlaceholder")}
        />
        <p className="mt-1 text-xs text-hajr-muted">{t("aiHint")}</p>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm transition hover:bg-hajr-rose/90 disabled:opacity-60"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
