"use client";
import { useTranslations } from "next-intl";
import type { TicketCategory } from "@prisma/client";

const STYLES: Record<TicketCategory, string> = {
  TECHNICAL: "bg-purple-100 text-purple-700",
  FINANCIAL: "bg-emerald-100 text-emerald-700",
  PEDAGOGICAL: "bg-blue-100 text-blue-700",
  SUGGESTION: "bg-pink-100 text-pink-700",
  GENERAL: "bg-slate-100 text-slate-600",
};

export function TicketCategoryBadge({ category }: { category: TicketCategory }) {
  const t = useTranslations("Tickets");
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[category]}`}
    >
      {t(`category_${category}`)}
    </span>
  );
}
