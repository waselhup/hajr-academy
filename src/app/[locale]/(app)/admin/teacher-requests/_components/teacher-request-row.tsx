"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

const STATUSES = ["PENDING", "CONTACTED", "CLOSED"] as const;
type Status = (typeof STATUSES)[number];

const VARIANT: Record<Status, "rose" | "info" | "success"> = {
  PENDING: "rose",
  CONTACTED: "info",
  CLOSED: "success",
};

export function TeacherRequestRow({
  row,
  locale,
}: {
  row: {
    id: string;
    status: string;
    message: string | null;
    createdAt: string | Date;
    studentName: string;
    teacherName: string;
    programName: string | null;
  };
  locale: string;
}) {
  const t = useTranslations("TeacherRequests");
  const router = useRouter();
  const [status, setStatus] = useState<Status>((row.status as Status) ?? "PENDING");
  const [pending, startTransition] = useTransition();
  const isAr = locale === "ar";

  function update(next: Status) {
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const res = await fetch(`/api/admin/teacher-requests/${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setStatus(prev);
      } else {
        router.refresh();
      }
    });
  }

  const date = new Date(row.createdAt);

  return (
    <tr className="border-t border-hajr-gray-100 align-top">
      <td className="px-3 py-2 font-medium text-hajr-text">{row.studentName}</td>
      <td className="px-3 py-2">{row.teacherName}</td>
      <td className="px-3 py-2">
        {row.programName ? (
          <Badge variant="outline">{row.programName}</Badge>
        ) : (
          <span className="text-hajr-gray-400">—</span>
        )}
      </td>
      <td className="max-w-xs px-3 py-2 text-hajr-gray-600">
        {row.message ? (
          <span className="line-clamp-2 whitespace-pre-wrap">{row.message}</span>
        ) : (
          <span className="text-hajr-gray-400">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-hajr-gray-500 num">
        {date.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge variant={VARIANT[status]}>{t(`status_${status}`)}</Badge>
          <select
            value={status}
            disabled={pending}
            onChange={(e) => update(e.target.value as Status)}
            dir={isAr ? "rtl" : "ltr"}
            className="h-8 rounded-md border border-hajr-gray-200 bg-white px-2 text-xs text-hajr-text disabled:opacity-50"
            aria-label={t("changeStatus")}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status_${s}`)}
              </option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  );
}
