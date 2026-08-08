import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText } from "lucide-react";
import { SchoolContractClient } from "./contract-client";

export const dynamic = "force-dynamic";

/**
 * /admin/schools/[id] — success-partner detail.
 *
 * The partnership is a referral arrangement: one discount code, the students
 * it brought in, and what the partner has earned on their first purchases.
 */
export default async function AdminSchoolDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Schools");
  const isAr = locale === "ar";

  const school = await prisma.partnerSchool.findUnique({
    where: { id },
    include: {
      students: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
      contracts: { orderBy: { createdAt: "desc" } },
      promoCodes: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { code: true, value: true, isActive: true, currentUses: true },
      },
    },
  });
  if (!school) notFound();

  // Every paid sale this partner's code brought in. `partnerCommissionSar` is
  // the amount frozen at settlement — never recomputed from today's rate.
  const orders = await prisma.purchaseOrder.findMany({
    where: { partnerSchoolId: id, paymentStatus: "PAID" },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      studentName: true,
      email: true,
      productSlug: true,
      amountSar: true,
      discountSar: true,
      promoCode: true,
      partnerCommissionSar: true,
      paidAt: true,
      createdAt: true,
    },
    take: 300,
  });

  const sales = orders.reduce((s, o) => s + Number(o.amountSar), 0);
  const commission = orders.reduce(
    (s, o) => s + Number(o.partnerCommissionSar ?? 0),
    0
  );

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      minimumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";
  const date = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit", month: "2-digit", year: "numeric",
          timeZone: "Asia/Riyadh",
        }).format(d)
      : "—";

  const promo = school.promoCodes[0] ?? null;
  const latestContract = school.contracts[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/schools">
            <ArrowLeft className="h-5 w-5 rtl-flip" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {isAr ? school.nameAr : school.nameEn}
        </h1>
        <Badge variant="outline">{t(`type_${school.partnerType ?? "SCHOOL"}`)}</Badge>
        <Badge variant={school.active ? "success" : "danger"}>
          {school.active ? t("active") : t("inactive")}
        </Badge>
      </div>

      {/* The arrangement, in one card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isAr ? "شروط الشراكة" : "Partnership terms"}
          </CardTitle>
          <CardDescription>
            {isAr
              ? "العمولة تُحتسب على أول عملية شراء لكل طالب فقط، وتُثبَّت وقت الدفع."
              : "Commission is earned on each student's first purchase only, and is frozen at the moment of payment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "رمز الخصم" : "Discount code"}
            </div>
            {promo ? (
              <div className="num text-xl font-bold tracking-wide" dir="ltr">
                {promo.code}
                {!promo.isActive && (
                  <Badge variant="danger" className="ms-2 align-middle">
                    {isAr ? "معطّل" : "Disabled"}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isAr ? "لا يوجد رمز — عدّل الشريك لإنشائه" : "No code — edit the partner to mint one"}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "خصم الطالب" : "Student discount"}
            </div>
            <div className="num text-xl font-bold">
              {promo ? Number(promo.value) : 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "عمولة الشريك" : "Partner commission"}
            </div>
            <div className="num text-xl font-bold text-hajr-rose">
              {Number(school.commissionPercent)}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("schoolInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Info label={t("contact")} value={school.contactName} />
          <Info label={t("email")} value={school.contactEmail} />
          <Info label={t("phone")} value={school.contactPhone} ltr />
          <Info label={t("city")} value={school.city} />
          {school.crNumber && (
            <Info label={t("crNumber")} value={school.crNumber} ltr />
          )}
          <Info
            label={isAr ? "مدة العقد" : "Contract"}
            value={`${date(school.contractStart)} → ${date(school.contractEnd)}`}
            ltr
          />
        </CardContent>
      </Card>

      {/* Referral results */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              {isAr ? "طلاب عن طريقه" : "Students referred"}
            </div>
            <div className="num text-xl font-bold">{school.students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              {isAr ? "مبيعات عن طريقه" : "Sales through this partner"}
            </div>
            <div className="num text-xl font-bold text-hajr-success">
              {money(sales)} {sar}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              {isAr ? "العمولة المستحقة" : "Commission owed"}
            </div>
            <div className="num text-xl font-bold text-hajr-rose">
              {money(commission)} {sar}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Every purchase made with this partner's code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAr ? "المشتريات عبر رمز الشريك" : "Purchases through this partner's code"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isAr ? "المنتج" : "Product"}</TableHead>
                  <TableHead>{isAr ? "المدفوع" : "Paid"}</TableHead>
                  <TableHead>{isAr ? "العمولة" : "Commission"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-6 text-center text-muted-foreground">
                      {isAr
                        ? "لم يشترِ أحد بهذا الرمز بعد."
                        : "Nobody has bought with this code yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => {
                    const c = Number(o.partnerCommissionSar ?? 0);
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="font-medium">{o.studentName}</div>
                          {o.email && (
                            <div className="text-xs text-muted-foreground" dir="ltr">{o.email}</div>
                          )}
                        </TableCell>
                        <TableCell className="num">{date(o.paidAt ?? o.createdAt)}</TableCell>
                        <TableCell className="text-xs">{o.productSlug ?? "—"}</TableCell>
                        <TableCell className="num">{money(Number(o.amountSar))} {sar}</TableCell>
                        <TableCell className="num">
                          {c > 0 ? (
                            <span className="font-semibold text-hajr-rose">{money(c)} {sar}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {isAr ? "ليست أول عملية" : "not a first purchase"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Contract management */}
      <SchoolContractClient
        schoolId={school.id}
        contract={
          latestContract
            ? {
                id: latestContract.id,
                startDate: latestContract.startDate.toISOString().slice(0, 10),
                endDate: latestContract.endDate.toISOString().slice(0, 10),
                totalStudents: latestContract.totalStudents,
                pricePerStudent: Number(latestContract.pricePerStudent),
                totalAmount: Number(latestContract.totalAmount),
                vatAmount: Number(latestContract.vatAmount),
                status: latestContract.status,
                notes: latestContract.notes,
              }
            : null
        }
      />

      {/* Report */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">{t("reportHint")}</span>
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/admin/schools/${school.id}/report`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="me-1.5 h-4 w-4" />
              {t("generateReport")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium ${ltr ? "num" : ""}`} dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}
