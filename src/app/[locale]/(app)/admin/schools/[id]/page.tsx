import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText } from "lucide-react";
import { SchoolContractClient } from "./contract-client";

export const dynamic = "force-dynamic";

/**
 * /admin/schools/[id] — partner-school detail: info, contract, enrolled
 * students, and a financial summary.
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
    },
  });
  if (!school) notFound();

  // Financial summary across this school's students.
  const studentIds = school.students.map((s) => s.id);
  const invoices =
    studentIds.length > 0
      ? await prisma.invoice.findMany({
          where: { studentId: { in: studentIds } },
          select: { totalSar: true, status: true },
        })
      : [];
  const invoiced = invoices.reduce((s, i) => s + Number(i.totalSar), 0);
  const paid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.totalSar), 0);

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";

  const latestContract = school.contracts[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/admin/schools`}>
            <ArrowLeft className="h-5 w-5 rtl-flip" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {isAr ? school.nameAr : school.nameEn}
        </h1>
        <Badge variant={school.active ? "success" : "danger"}>
          {school.active ? t("active") : t("inactive")}
        </Badge>
      </div>

      {/* School info */}
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
            label={t("studentsCount")}
            value={`${school.students.length} / ${school.studentCap}`}
          />
        </CardContent>
      </Card>

      {/* Financial summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{t("invoiced")}</div>
            <div className="text-xl font-bold num">
              {money(invoiced)} {sar}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{t("paid")}</div>
            <div className="text-xl font-bold num text-hajr-success">
              {money(paid)} {sar}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              {t("outstanding")}
            </div>
            <div className="text-xl font-bold num text-hajr-warning">
              {money(invoiced - paid)} {sar}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract management */}
      <SchoolContractClient
        schoolId={school.id}
        contract={
          latestContract
            ? {
                id: latestContract.id,
                startDate: latestContract.startDate
                  .toISOString()
                  .slice(0, 10),
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
          <span className="text-sm text-muted-foreground">
            {t("reportHint")}
          </span>
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

      {/* Enrolled students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("enrolledStudents")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("grade")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {school.students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noStudents")}
                  </TableCell>
                </TableRow>
              ) : (
                school.students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {isAr ? s.user.nameAr ?? s.user.name : s.user.name}
                    </TableCell>
                    <TableCell>{s.gradeLevel ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
