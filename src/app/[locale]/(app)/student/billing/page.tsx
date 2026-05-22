import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPackage, PACKAGE_LIST } from "@/lib/finance/packages";
import { StudentBillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

/**
 * /student/billing — the student's subscription, payment history, and
 * package selection. Server-fetches state; the client handles actions.
 */
export default async function StudentBillingPage() {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Billing");

  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  let subscription: Awaited<ReturnType<typeof loadSubscription>> = null;
  let invoices: Awaited<ReturnType<typeof loadInvoices>> = [];

  if (student) {
    [subscription, invoices] = await Promise.all([
      loadSubscription(student.id),
      loadInvoices(student.id),
    ]);
  }

  const packages = PACKAGE_LIST.map((p) => {
    const vat = +(p.pricePerMonth * 0.15).toFixed(2);
    return {
      key: p.key,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      pricePerMonth: p.pricePerMonth,
      vatAmount: vat,
      totalWithVat: +(p.pricePerMonth + vat).toFixed(2),
      sessionsPerMonth: p.sessionsPerMonth,
      featuresAr: p.featuresAr,
      featuresEn: p.featuresEn,
      labAccess: p.labAccess,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("myBilling")}</h1>
      <StudentBillingClient
        subscription={subscription}
        invoices={invoices}
        packages={packages}
      />
    </div>
  );
}

async function loadSubscription(studentId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return null;
  let pkg = null;
  try {
    pkg = getPackage(sub.packageType);
  } catch {
    /* SCHOOL — leave null */
  }
  return {
    id: sub.id,
    packageType: sub.packageType,
    packageNameAr: pkg?.nameAr ?? sub.packageType,
    packageNameEn: pkg?.nameEn ?? sub.packageType,
    status: sub.status,
    pricePerMonth: Number(sub.pricePerMonth),
    discountAmount: Number(sub.discountAmount),
    totalWithVat: Number(sub.totalWithVat),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    nextBillingDate: sub.nextBillingDate?.toISOString() ?? null,
    autoRenew: sub.autoRenew,
  };
}

async function loadInvoices(studentId: string) {
  const rows = await prisma.invoice.findMany({
    where: { studentId },
    orderBy: { issuedAt: "desc" },
    take: 50,
  });
  return rows.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.invoiceStatus,
    totalAmount: Number(inv.totalSar),
    issuedAt: inv.issuedAt.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
  }));
}
