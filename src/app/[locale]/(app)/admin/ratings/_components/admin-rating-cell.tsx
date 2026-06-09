"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

/**
 * Compact inline control for the admin-entered teacher rating (1..5).
 * On change it POSTs to /api/admin/teachers/[teacherId]/admin-rating and
 * refreshes the server component. "—" clears the rating (sends null).
 * Western digits only (1-5 are literal ASCII).
 */
export function AdminRatingCell({
  teacherId,
  value,
}: {
  teacherId: string;
  value: number | null;
}) {
  const router = useRouter();
  const t = useTranslations("Ratings");
  const [pending, startTransition] = useTransition();
  // Local optimistic value so the select reflects the choice immediately.
  const [current, setCurrent] = useState<number | null>(value);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    const next = raw === "" ? null : Number(raw);
    setCurrent(next);
    startTransition(async () => {
      const r = await fetch(`/api/admin/teachers/${teacherId}/admin-rating`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        router.refresh();
      } else {
        // Revert on failure.
        setCurrent(value);
        alert(d.error || "Failed to save rating");
      }
    });
  }

  return (
    <select
      aria-label={t("adminRatingHint")}
      title={t("adminRatingHint")}
      value={current ?? ""}
      onChange={onChange}
      disabled={pending}
      className="num h-8 rounded-lg border border-hajr-gray-200 bg-white px-2 text-sm text-hajr-black focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">—</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5</option>
    </select>
  );
}
