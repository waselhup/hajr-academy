import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPackage } from "@/lib/finance/packages";
import { listActiveProducts } from "@/lib/finance/catalog";
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

  // Prices come from the same catalogue the public site sells from. The old
  // in-code package table had drifted (IELTS 800 here vs 1,200 published), so
  // a student buying from inside the app would have been charged a different
  // price from one buying on the landing page.
  const catalogue = await listActiveProducts();
  const packages = catalogue.map((p) => ({
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    price: p.priceSar,
    unitAr: p.unitAr,
    unitEn: p.unitEn,
    descAr: p.descAr,
    descEn: p.descEn,
    group: p.group,
  }));

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
