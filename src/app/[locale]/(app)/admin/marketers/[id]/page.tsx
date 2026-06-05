import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { MarketerActions } from "./actions";

export const dynamic = "force-dynamic";

function fmt(n: number | string): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(Number(n));
}

export default async function AdminMarketerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale, id } = await params;
  const isAr = locale === "ar";
  const t = await getTranslations("Marketer");

  const m = await prisma.marketerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, nameAr: true, email: true, phone: true, isActive: true } },
      referrals: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { student: { include: { user: { select: { name: true, nameAr: true } } } } },
      },
      commissions: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { invoice: { select: { invoiceNumber: true, totalSar: true } } },
      },
    },
  });
  if (!m) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <Link href="/admin/marketers" className="text-xs text-hajr-muted hover:text-hajr-rose">
          ← {isAr ? "العودة" : "Back"}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-hajr-text">
          {isAr ? m.user.nameAr || m.user.name : m.user.name}
        </h1>
        <div className="text-sm text-hajr-muted">{m.user.email} · {m.user.phone || "—"}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
          <h2 className="mb-3 text-base font-semibold text-hajr-text">{isAr ? "بيانات الحساب" : "Account"}</h2>
          <dl className="space-y-2 text-sm">
            <Row label={isAr ? "الكود" : "Code"} val={<span className="font-mono">{m.referralCode}</span>} />
            <Row label={isAr ? "الحالة" : "Status"} val={t(`status_${m.status}`)} />
            <Row label={isAr ? "نسبة" : "Rate"} val={`${(Number(m.commissionRate) * 100).toFixed(0)}%`} />
            <Row label={isAr ? "اللاحقات الكلية" : "Total earned"} val={`${fmt(m.totalEarned.toString())} SAR`} />
            <Row label={isAr ? "المدفوع" : "Total paid"} val={`${fmt(m.totalPaid.toString())} SAR`} />
          </dl>
        </section>

        <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
          <h2 className="mb-3 text-base font-semibold text-hajr-text">{isAr ? "البنك" : "Bank"}</h2>
          <dl className="space-y-2 text-sm">
            <Row label="IBAN" val={m.bankIban || "—"} />
            <Row label={isAr ? "اسم البنك" : "Bank"} val={m.bankName || "—"} />
            <Row label={isAr ? "صاحب الحساب" : "Holder"} val={m.bankHolder || "—"} />
          </dl>
        </section>
      </div>

      <MarketerActions
        marketerId={m.id}
        currentStatus={m.status}
        currentRate={Number(m.commissionRate)}
        locale={locale}
      />

      <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold text-hajr-text">{isAr ? "الإحالات" : "Referrals"} ({m.referrals.length})</h2>
        {m.referrals.length === 0 ? (
          <p className="text-sm text-hajr-muted">—</p>
        ) : (
          <ul className="divide-y divide-hajr-border text-sm">
            {m.referrals.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-hajr-text">
                    {r.student
                      ? isAr
                        ? r.student.user.nameAr || r.student.user.name
                        : r.student.user.name
                      : r.contactEmail || "—"}
                  </div>
                  <div className="text-xs text-hajr-muted">{r.createdAt.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")}</div>
                </div>
                <span className={`text-xs ${r.converted ? "text-hajr-success" : "text-hajr-warning"}`}>
                  {r.converted ? (isAr ? "محوّل ✓" : "Converted ✓") : isAr ? "قيد الانتظار" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold text-hajr-text">{isAr ? "العمولات" : "Commissions"} ({m.commissions.length})</h2>
        {m.commissions.length === 0 ? (
          <p className="text-sm text-hajr-muted">—</p>
        ) : (
          <ul className="divide-y divide-hajr-border text-sm">
            {m.commissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-hajr-text">{c.invoice.invoiceNumber}</div>
                  <div className="text-xs text-hajr-muted">
                    {c.createdAt.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")} · {t(`status_${c.status}`)}
                  </div>
                </div>
                <span className="font-medium text-hajr-text">{fmt(c.amount.toString())} SAR</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-hajr-muted">{label}</dt>
      <dd className="text-hajr-text">{val}</dd>
    </div>
  );
}
