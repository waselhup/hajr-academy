"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/western-fields";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface PromoRow {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
  timesUsed: number;
  partnerSchoolId: string | null;
  partnerNameEn: string | null;
  partnerNameAr: string | null;
}

type PartnerType = "CHARITY" | "SCHOOL" | "INDIVIDUAL";
interface Partner {
  id: string;
  nameEn: string;
  nameAr: string;
  partnerType: PartnerType;
}

const ALL_TYPES = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_MONTHS"];

/**
 * Which discount types a promo may use, given the selected Success Partner:
 *  - CHARITY / SCHOOL → percentage only (+ free months).
 *  - INDIVIDUAL (or no partner) → percentage OR fixed amount (+ free months).
 * FIXED_AMOUNT is the only type gated by partner kind.
 */
function allowedTypes(partner: Partner | undefined): string[] {
  if (partner && partner.partnerType !== "INDIVIDUAL") {
    return ALL_TYPES.filter((ty) => ty !== "FIXED_AMOUNT");
  }
  return ALL_TYPES;
}

export function AdminPromoCodesClient({
  codes,
  partners,
}: {
  codes: PromoRow[];
  partners: Partner[];
}) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: "",
    maxUses: "",
    expiresAt: "",
    partnerSchoolId: "",
  });

  const selectedPartner = partners.find((p) => p.id === form.partnerSchoolId);
  const typeOptions = allowedTypes(selectedPartner);
  const partnerName = (p: Partner) => (isAr ? p.nameAr : p.nameEn);

  const date = (s: string | null) =>
    s ? new Date(s).toISOString().slice(0, 10) : "—";

  async function createCode() {
    if (!form.code.trim() || !form.value) {
      toast.error(isAr ? "أكمل الحقول المطلوبة" : "Fill required fields");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          type: form.type,
          value: Number(form.value),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
          partnerSchoolId: form.partnerSchoolId || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(isAr ? "تم إنشاء الرمز" : "Promo code created");
        setOpen(false);
        setForm({
          code: "",
          type: "PERCENTAGE",
          value: "",
          maxUses: "",
          expiresAt: "",
          partnerSchoolId: "",
        });
        router.refresh();
      } else {
        toast.error(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: PromoRow) {
    const res = await fetch(`/api/promo-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if ((await res.json()).ok) {
      toast.success(isAr ? "تم التحديث" : "Updated");
      router.refresh();
    } else {
      toast.error("Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="me-1.5 h-4 w-4" />
          {t("createPromo")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("value")}</TableHead>
                <TableHead>{t("organization")}</TableHead>
                <TableHead>{t("uses")}</TableHead>
                <TableHead>{t("validUntil")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="num font-semibold">
                      {c.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.type}</Badge>
                    </TableCell>
                    <TableCell className="num">
                      {c.type === "PERCENTAGE"
                        ? `${c.value}%`
                        : c.type === "FREE_MONTHS"
                          ? `${c.value} ${isAr ? "شهر" : "mo"}`
                          : `${c.value} ${isAr ? "ر.س" : "SAR"}`}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.partnerSchoolId
                        ? (isAr ? c.partnerNameAr : c.partnerNameEn) ?? "—"
                        : "—"}
                    </TableCell>
                    <TableCell className="num">
                      {c.timesUsed}
                      {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                    </TableCell>
                    <TableCell className="num">
                      {date(c.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "success" : "outline"}>
                        {c.isActive
                          ? isAr
                            ? "فعّال"
                            : "Active"
                          : isAr
                            ? "معطّل"
                            : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(c)}
                      >
                        {c.isActive ? t("deactivate") : t("activate")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createPromo")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("code")}</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="HAJR20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("type")}</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full rounded-md border p-2 text-sm"
                >
                  {typeOptions.map((ty) => (
                    <option key={ty} value={ty}>
                      {ty === "PERCENTAGE"
                        ? t("percentage")
                        : ty === "FIXED_AMOUNT"
                          ? t("fixedAmount")
                          : t("freeMonths")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("value")}</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) =>
                    setForm({ ...form, value: e.target.value })
                  }
                  placeholder="20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("uses")} (max)</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm({ ...form, maxUses: e.target.value })
                  }
                  placeholder="∞"
                />
              </div>
              <div>
                <Label>{t("validUntil")}</Label>
                <DateField
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm({ ...form, expiresAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>{t("organization")}</Label>
              <select
                value={form.partnerSchoolId}
                onChange={(e) => {
                  const partnerSchoolId = e.target.value;
                  const next = partners.find((p) => p.id === partnerSchoolId);
                  const allowed = allowedTypes(next);
                  setForm((f) => ({
                    ...f,
                    partnerSchoolId,
                    // If the new partner type forbids the current type, fall back.
                    type: allowed.includes(f.type) ? f.type : "PERCENTAGE",
                  }));
                }}
                className="mt-1 w-full rounded-md border p-2 text-sm"
              >
                <option value="">{t("organizationNone")}</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {partnerName(p)} — {t(("organizationType_" + p.partnerType) as any)}
                  </option>
                ))}
              </select>
              {selectedPartner && selectedPartner.partnerType !== "INDIVIDUAL" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("promoTypeHintFixed")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t("cancel")}
            </Button>
            <Button onClick={createCode} disabled={busy}>
              {busy ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
