import { Link } from "@/i18n/routing";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPlacementLeadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;
  const isAr = locale === "ar";

  const leads = await prisma.contactSubmission.findMany({
    where: { source: "placement_test" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div>
        <Link href="/admin/placement-tests" className="text-xs text-hajr-muted hover:text-hajr-rose">
          ← {isAr ? "العودة" : "Back"}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-hajr-text">
          {isAr ? "طلبات من اختبارات تحديد المستوى" : "Placement-sourced leads"}
        </h1>
        <p className="text-sm text-hajr-muted">
          {isAr
            ? "كل سطر يمثّل ضيفاً أكمل اختبار تحديد المستوى. تواصل معه ضمن ٢٤ ساعة."
            : "Each row is a guest who completed a placement test. Reach out within 24 hours."}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hajr-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-hajr-ivory text-left text-xs uppercase tracking-wider text-hajr-muted">
            <tr>
              <th className="px-3 py-3">{isAr ? "الاسم" : "Name"}</th>
              <th className="px-3 py-3">{isAr ? "البريد" : "Email"}</th>
              <th className="px-3 py-3">{isAr ? "الجوال" : "Phone"}</th>
              <th className="px-3 py-3">{isAr ? "ملخص" : "Summary"}</th>
              <th className="px-3 py-3">{isAr ? "التاريخ" : "Date"}</th>
              <th className="px-3 py-3">{isAr ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hajr-border">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-hajr-surface">
                <td className="px-3 py-2 text-hajr-text">{l.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{l.email}</td>
                <td className="px-3 py-2 text-xs">{l.phone || "—"}</td>
                <td className="px-3 py-2 max-w-md whitespace-pre-wrap text-xs text-hajr-muted">{l.message}</td>
                <td className="px-3 py-2 text-xs text-hajr-muted">
                  {l.createdAt.toLocaleDateString(isAr ? "ar" : "en")}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      l.status === "NEW"
                        ? "bg-hajr-warning/15 text-hajr-warning"
                        : l.status === "REPLIED"
                        ? "bg-hajr-mint/30 text-hajr-deep-navy"
                        : "bg-hajr-border text-hajr-muted"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-hajr-muted">
                  {isAr ? "لا توجد طلبات بعد" : "No leads yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
