"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  marketerName: string;
  marketerEmail: string;
  studentName: string;
  invoiceNumber: string;
  invoiceTotal: number;
  amount: number;
  rate: number;
  createdAt: string;
};

type Props = {
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  locale: string;
  commissions: Row[];
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
}

export function CommissionsAdminClient({ status, locale, commissions }: Props) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((s) => (s.size === commissions.length ? new Set() : new Set(commissions.map((c) => c.id))));
  }

  async function act(action: "APPROVE" | "PAY" | "REJECT", id?: string, reason?: string) {
    setErr(null);
    const ids = id ? [id] : Array.from(selected);
    if (ids.length === 0) return;
    const res = await fetch("/api/marketers/admin/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, reason }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error || "Failed");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <button
            disabled={selected.size === 0 || pending}
            onClick={() => startTransition(() => act("APPROVE"))}
            className="h-9 rounded-lg bg-hajr-success px-3 text-xs font-medium text-white disabled:opacity-50"
          >
            {isAr ? `اعتماد المحدد (${selected.size})` : `Approve selected (${selected.size})`}
          </button>
        )}
        {status === "APPROVED" && (
          <button
            disabled={selected.size === 0 || pending}
            onClick={() => startTransition(() => act("PAY"))}
            className="h-9 rounded-lg bg-hajr-deep-navy px-3 text-xs font-medium text-white disabled:opacity-50"
          >
            {isAr ? `وضع كمدفوع (${selected.size})` : `Mark as paid (${selected.size})`}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-hajr-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-hajr-ivory text-left text-xs uppercase tracking-wider text-hajr-muted">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === commissions.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-3">{isAr ? "المسوّق" : "Marketer"}</th>
              <th className="px-3 py-3">{isAr ? "الطالب" : "Student"}</th>
              <th className="px-3 py-3">{isAr ? "الفاتورة" : "Invoice"}</th>
              <th className="px-3 py-3">{isAr ? "العمولة" : "Amount"}</th>
              <th className="px-3 py-3">{isAr ? "التاريخ" : "Date"}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hajr-border">
            {commissions.map((c) => (
              <tr key={c.id} className="hover:bg-hajr-surface">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-hajr-text">{c.marketerName}</div>
                  <div className="text-xs text-hajr-muted">{c.marketerEmail}</div>
                </td>
                <td className="px-3 py-3 text-hajr-text">{c.studentName}</td>
                <td className="px-3 py-3">
                  <div className="font-mono text-xs">{c.invoiceNumber}</div>
                  <div className="text-xs text-hajr-muted">{fmt(c.invoiceTotal)} SAR</div>
                </td>
                <td className="px-3 py-3 font-bold text-hajr-text">
                  {fmt(c.amount)} SAR <span className="text-xs text-hajr-muted">({(c.rate * 100).toFixed(0)}%)</span>
                </td>
                <td className="px-3 py-3 text-xs text-hajr-muted">
                  {new Date(c.createdAt).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")}
                </td>
                <td className="px-3 py-3 text-end">
                  {status === "PENDING" && (
                    <div className="inline-flex gap-1">
                      <button
                        disabled={pending}
                        onClick={() => startTransition(() => act("APPROVE", c.id))}
                        className="h-8 rounded-md bg-hajr-success px-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {isAr ? "اعتماد" : "Approve"}
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => {
                          const reason = prompt(isAr ? "سبب الرفض:" : "Rejection reason:");
                          if (reason === null) return;
                          startTransition(() => act("REJECT", c.id, reason));
                        }}
                        className="h-8 rounded-md bg-hajr-error px-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {isAr ? "رفض" : "Reject"}
                      </button>
                    </div>
                  )}
                  {status === "APPROVED" && (
                    <button
                      disabled={pending}
                      onClick={() => startTransition(() => act("PAY", c.id))}
                      className="h-8 rounded-md bg-hajr-deep-navy px-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {isAr ? "دفع" : "Pay"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-hajr-muted">
                  {isAr ? "لا توجد عمولات في هذه الحالة" : "No commissions in this state"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {err && <p className="text-xs text-hajr-error">{err}</p>}
    </div>
  );
}
