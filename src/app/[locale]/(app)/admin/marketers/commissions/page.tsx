import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { CommissionsAdminClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === "ar";
  const t = await getTranslations("Marketer");

  const status = (sp.status?.toUpperCase() as "PENDING" | "APPROVED" | "PAID" | "REJECTED") || "PENDING";

  const rows = await prisma.commission.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      marketer: { include: { user: { select: { name: true, nameAr: true, email: true } } } },
      student: { include: { user: { select: { name: true, nameAr: true } } } },
      invoice: { select: { invoiceNumber: true, totalSar: true } },
    },
    take: 200,
  });

  const counts = await prisma.commission.groupBy({ by: ["status"], _count: true });
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div>
        <Link href={`/${locale}/admin/marketers`} className="text-xs text-hajr-muted hover:text-hajr-rose">
          ← {isAr ? "العودة للمسوّقين" : "Back to marketers"}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-hajr-text">{t("adminCommissions")}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "PAID", "REJECTED"] as const).map((s) => (
          <Link
            key={s}
            href={`/${locale}/admin/marketers/commissions?status=${s.toLowerCase()}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === s
                ? "border-hajr-deep-navy bg-hajr-deep-navy text-white"
                : "border-hajr-border bg-white text-hajr-text"
            }`}
          >
            {t(`status_${s}`)}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${status === s ? "bg-white/20" : "bg-hajr-ivory"}`}>
              {countByStatus[s] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <CommissionsAdminClient
        status={status}
        locale={locale}
        commissions={rows.map((r) => ({
          id: r.id,
          marketerName: isAr ? r.marketer.user.nameAr || r.marketer.user.name : r.marketer.user.name,
          marketerEmail: r.marketer.user.email,
          studentName: isAr ? r.student.user.nameAr || r.student.user.name : r.student.user.name,
          invoiceNumber: r.invoice.invoiceNumber,
          invoiceTotal: Number(r.invoice.totalSar),
          amount: Number(r.amount),
          rate: Number(r.rateApplied),
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
