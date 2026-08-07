"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, CreditCard, Download, Sparkles, Tag } from "lucide-react";

interface PackageInfo {
  slug: string;
  nameAr: string;
  nameEn: string;
  price: number;
  unitAr: string;
  unitEn: string;
  descAr: string | null;
  descEn: string | null;
  group: string;
}
interface Subscription {
  id: string;
  packageType: string;
  packageNameAr: string;
  packageNameEn: string;
  status: string;
  pricePerMonth: number;
  discountAmount: number;
  totalWithVat: number;
  currentPeriodEnd: string;
  nextBillingDate: string | null;
  autoRenew: boolean;
}
interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  issuedAt: string;
  dueDate: string;
  paidAt: string | null;
}

function statusVariant(s: string): "success" | "warning" | "danger" | "outline" {
  if (s === "PAID" || s === "ACTIVE") return "success";
  if (s === "PENDING" || s === "PAUSED" || s === "DRAFT") return "warning";
  if (s === "OVERDUE" || s === "PAST_DUE") return "danger";
  return "outline";
}

export function StudentBillingClient({
  subscription,
  invoices,
  packages,
}: {
  subscription: Subscription | null;
  invoices: InvoiceRow[];
  packages: PackageInfo[];
}) {
  const t = useTranslations("Billing");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoResult, setPromoResult] = useState<
    { discount: number; total: number; code: string } | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  function money(n: number) {
    return new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  function date(s: string) {
    return new Date(s).toISOString().slice(0, 10);
  }

  async function checkPromo() {
    if (!selectedPkg || !promo.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promo.trim(), packageType: selectedPkg }),
      });
      const json = await res.json();
      if (json.valid) {
        setPromoResult({
          discount: json.discountAmount,
          total: json.preview.total,
          code: json.code,
        });
        toast.success(t("promoApplied"));
      } else {
        setPromoResult(null);
        toast.error(isAr ? json.reasonAr ?? json.reason : json.reason);
      }
    } catch {
      toast.error(isAr ? "تعذّر التحقق" : "Validation failed");
    } finally {
      setBusy(false);
    }
  }

  async function subscribe() {
    if (!selectedPkg) return;
    setBusy(true);
    try {
      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType: selectedPkg,
          autoRenew,
          promoCode: promoResult?.code ?? null,
        }),
      });
      const json = await res.json();
      if (json.ok && json.invoiceId) {
        router.push(`/${locale}/student/billing/pay/${json.invoiceId}`);
      } else {
        toast.error(isAr ? json.errorAr ?? json.error : json.error);
        setBusy(false);
      }
    } catch {
      toast.error(isAr ? "حدث خطأ" : "Something went wrong");
      setBusy(false);
    }
  }

  async function cancelSub() {
    if (!subscription) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(isAr ? "تم إلغاء الاشتراك" : "Subscription cancelled");
        router.refresh();
      } else {
        toast.error(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
      setCancelOpen(false);
    }
  }

  const isSubscribed =
    subscription &&
    ["ACTIVE", "PAUSED", "PAST_DUE", "TRIAL"].includes(subscription.status);

  return (
    <div className="space-y-6">
      {/* Current subscription */}
      {isSubscribed && subscription ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("currentPlan")}</span>
              <Badge variant={statusVariant(subscription.status)}>
                {subscription.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("subscription")}
                </div>
                <div className="font-semibold">
                  {isAr
                    ? subscription.packageNameAr
                    : subscription.packageNameEn}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("monthlyAmount")}
                </div>
                <div className="font-semibold num">
                  {money(subscription.totalWithVat)} {isAr ? "ر.س" : "SAR"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("nextBilling")}
                </div>
                <div className="font-semibold num">
                  {subscription.nextBillingDate
                    ? date(subscription.nextBillingDate)
                    : "—"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelOpen(true)}
                disabled={
                  busy || subscription.status === "CANCELLED"
                }
              >
                {t("cancelSubscription")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Package selection — one catalogue, one price, one checkout.
           Buying here goes through the same public checkout as the landing
           page; the payment then finds this student's account by email. */
        <Card>
          <CardHeader>
            <CardTitle>{t("choosePackage")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {packages.map((p) => {
                const active = selectedPkg === p.slug;
                return (
                  <button
                    key={p.slug}
                    onClick={() => setSelectedPkg(p.slug)}
                    className={`rounded-xl border-2 p-4 text-start transition-all ${
                      active
                        ? "border-hajr-rose bg-hajr-rose/5 shadow-sm"
                        : "border-border hover:border-hajr-rose/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{isAr ? p.nameAr : p.nameEn}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-hajr-rose" />}
                    </div>
                    <div className="mt-2">
                      <span className="num text-2xl font-bold">{money(p.price)}</span>
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        {isAr ? p.unitAr : p.unitEn}
                      </span>
                    </div>
                    {(isAr ? p.descAr : p.descEn) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {isAr ? p.descAr : p.descEn}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedPkg && (
              <Button asChild className="w-full" size="lg">
                <a href={`/${locale}/checkout?product=${selectedPkg}`}>
                  <Sparkles className="me-2 h-4 w-4" />
                  {t("subscribe")}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t("paymentHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoiceNumber")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-end">—</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noInvoices")}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="num">{inv.invoiceNumber}</TableCell>
                    <TableCell className="num">{date(inv.issuedAt)}</TableCell>
                    <TableCell className="num">
                      {money(inv.totalAmount)} {isAr ? "ر.س" : "SAR"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {inv.status !== "PAID" &&
                          inv.status !== "CANCELLED" && (
                            <Button asChild size="sm">
                              <Link
                                href={`/${locale}/student/billing/pay/${inv.id}`}
                              >
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

      {/* Cancel dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelSubscription")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder={t("cancelReason")}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepSubscription")}</AlertDialogCancel>
            <AlertDialogAction onClick={cancelSub} disabled={busy}>
              {t("confirmCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
