"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  initial: { bankIban: string; bankName: string; bankHolder: string };
};

export function ProfileBankForm({ initial }: Props) {
  const t = useTranslations("Marketer");
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/marketers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Failed");
      }
      setMsg(t("saved"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold text-hajr-text">{t("bankInfo")}</h2>

      <div>
        <label htmlFor="iban" className="mb-1 block text-xs text-hajr-muted">
          {t("bankIban")}
        </label>
        <input
          id="iban"
          value={form.bankIban}
          onChange={(e) => setForm((f) => ({ ...f, bankIban: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
          placeholder="SA00 0000 0000 0000 0000 0000"
        />
      </div>

      <div>
        <label htmlFor="bankName" className="mb-1 block text-xs text-hajr-muted">
          {t("bankName")}
        </label>
        <input
          id="bankName"
          value={form.bankName}
          onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="holder" className="mb-1 block text-xs text-hajr-muted">
          {t("bankHolder")}
        </label>
        <input
          id="holder"
          value={form.bankHolder}
          onChange={(e) => setForm((f) => ({ ...f, bankHolder: e.target.value }))}
          className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="h-11 w-full rounded-lg bg-hajr-deep-navy px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "…" : t("saveBank")}
      </button>

      {msg && <p className="text-xs text-hajr-success">{msg}</p>}
      {err && <p className="text-xs text-hajr-error">{err}</p>}
    </form>
  );
}
