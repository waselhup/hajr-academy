"use client";
import { useTranslations } from "next-intl";
import type { TicketPriority } from "@prisma/client";

const STYLES: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const t = useTranslations("Tickets");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[priority]}`}
    >
      {t(`priority_${priority}`)}
    </span>
  );
}
