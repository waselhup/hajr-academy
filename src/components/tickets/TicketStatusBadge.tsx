"use client";
import { useTranslations } from "next-intl";
import type { TicketStatus } from "@prisma/client";

const STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const t = useTranslations("Tickets");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}
    >
      {t(`status_${status}`)}
    </span>
  );
}
