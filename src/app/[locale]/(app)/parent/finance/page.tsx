import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /parent/finance — every invoice across the parent's children, with
 * download + pay-on-behalf links. Parents can settle a child's invoice
 * through the same Moyasar flow.
 */
export default async function ParentFinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations("ParentPortal");
  const isAr = locale === "ar";

  let invoices: {
    id: string;
    invoiceNumber: string;
    studentName: string;
    status: string;
    totalAmount: number;
    issuedAt: string;
    dueDate: string;
  }[] = [];

  try {
    const parent = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: { childLinks: { select: { studentId: true } } },
    });
    if (parent && parent.childLinks.length > 0) {
      const rows = await prisma.invoice.findMany({
        where: {
          studentId: { in: parent.childLinks.map((l) => l.studentId) },
        },
        orderBy: { issuedAt: "desc" },
        take: 100,
        include: {
          student: {
            include: { user: { select: { name: true, nameAr: true } } },
          },
        },
      });
      invoices = rows.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentName: isAr
          ? inv.student.user.nameAr ?? inv.student.user.name
          : inv.student.user.name,
        status: inv.invoiceStatus,
        totalAmount: Number(inv.totalSar),
        issuedAt: inv.issuedAt.toISOString(),
        dueDate: inv.dueDate.toISOString(),
      }));
    }
  } catch (e) {
    console.error("[parent-finance] failed:", e);
  }

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";
  const date = (s: string) => new Date(s).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("finance")}</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoice")}</TableHead>
                <TableHead>{t("child")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("dueDate")}</TableHead>
                <TableHead className="text-end">—</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noInvoices")}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="num">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.studentName}</TableCell>
                    <TableCell className="num">
                      {money(inv.totalAmount)} {sar}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === "PAID"
                            ? "success"
                            : inv.status === "OVERDUE"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="num">{date(inv.dueDate)}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {inv.status !== "PAID" &&
                          inv.status !== "CANCELLED" && (
                            <Button asChild size="sm">
                              <Link href={`/${locale}/parent/pay/${inv.id}`}>
                                {t("payNow")}
                              </Link>
                            </Button>
                          )}
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
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
