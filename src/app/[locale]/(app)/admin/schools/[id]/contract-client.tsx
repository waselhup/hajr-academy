"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileSignature, Loader2 } from "lucide-react";

interface Contract {
  id: string;
  startDate: string;
  endDate: string;
  totalStudents: number;
  pricePerStudent: number;
  totalAmount: number;
  vatAmount: number;
  status: string;
  notes: string | null;
}

const STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];

export function SchoolContractClient({
  schoolId,
  contract,
}: {
  schoolId: string;
  contract: Contract | null;
}) {
  const t = useTranslations("Schools");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [editing, setEditing] = useState(!contract);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    startDate: contract?.startDate ?? "",
    endDate: contract?.endDate ?? "",
    totalStudents: contract?.totalStudents ?? 0,
    pricePerStudent: contract?.pricePerStudent ?? 0,
    status: contract?.status ?? "DRAFT",
    notes: contract?.notes ?? "",
  });

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";

  // Live preview of the computed totals.
  const subtotal = +(form.totalStudents * form.pricePerStudent).toFixed(2);
  const vat = +(subtotal * 0.15).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);

  async function save() {
    if (!form.startDate || !form.endDate || form.totalStudents < 1) {
      toast.error(isAr ? "أكمل الحقول المطلوبة" : "Fill required fields");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract?.id,
          startDate: form.startDate,
          endDate: form.endDate,
          totalStudents: form.totalStudents,
          pricePerStudent: form.pricePerStudent,
          status: form.status,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(isAr ? "تم حفظ العقد" : "Contract saved");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{t("contract")}</span>
          {contract && !editing && (
            <Badge
              variant={
                contract.status === "ACTIVE"
                  ? "success"
                  : contract.status === "CANCELLED"
                    ? "danger"
                    : contract.status === "COMPLETED"
                      ? "info"
                      : "warning"
              }
            >
              {contract.status}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing && contract ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("contractStart")} value={contract.startDate} />
              <Field label={t("contractEnd")} value={contract.endDate} />
              <Field
                label={t("totalStudents")}
                value={String(contract.totalStudents)}
              />
              <Field
                label={t("pricePerStudent")}
                value={`${money(contract.pricePerStudent)} ${sar}`}
              />
              <Field
                label={t("vat")}
                value={`${money(contract.vatAmount)} ${sar}`}
              />
              <Field
                label={t("totalAmount")}
                value={`${money(contract.totalAmount + contract.vatAmount)} ${sar}`}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <FileSignature className="me-1.5 h-4 w-4" />
              {t("editContract")}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("contractStart")}</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t("contractEnd")}</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t("totalStudents")}</Label>
                <Input
                  type="number"
                  value={form.totalStudents}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      totalStudents: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>{t("pricePerStudent")} (SAR)</Label>
                <Input
                  type="number"
                  step="50"
                  value={form.pricePerStudent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricePerStudent: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>{t("status")}</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border p-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>{t("notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            {/* Live total preview */}
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span className="num">
                  {money(subtotal)} {sar}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("vat")}</span>
                <span className="num">
                  {money(vat)} {sar}
                </span>
              </div>
              <div className="mt-1 flex justify-between font-bold">
                <span>{t("totalAmount")}</span>
                <span className="num">
                  {money(total)} {sar}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {contract && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  {t("cancel")}
                </Button>
              )}
              <Button size="sm" onClick={save} disabled={busy}>
                {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("save")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="num font-medium">{value}</div>
    </div>
  );
}
