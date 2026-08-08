"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, MoreHorizontal, Power, Loader2, Calendar, Eye, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/western-fields";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { createSchoolAction, updateSchoolAction, toggleSchoolActiveAction } from "../../_actions/schools";
import { fmtSAR } from "@/lib/format";

const CITIES = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar", "Tabuk", "Abha", "Hofuf", "Other"];

type PartnerType = "CHARITY" | "SCHOOL" | "INDIVIDUAL";
const PARTNER_TYPES: PartnerType[] = ["CHARITY", "SCHOOL", "INDIVIDUAL"];

type Row = {
  id: string;
  nameEn: string; nameAr: string;
  contactName: string; contactEmail: string; contactPhone: string;
  city: string;
  partnerType: PartnerType;
  contractStart: string; contractEnd: string;
  commissionPercent: number;
  promoCode: string | null;
  discountPercent: number;
  promoActive: boolean;
  studentCap: number;
  active: boolean;
  students: number;
  orders: number;
  revenueSar: number;
  commissionSar: number;
};

const schema = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  city: z.string(),
  partnerType: z.enum(["CHARITY", "SCHOOL", "INDIVIDUAL"]),
  contractStart: z.string(),
  contractEnd: z.string(),
  discountPercent: z.coerce.number().min(0).max(100),
  commissionPercent: z.coerce.number().min(0).max(100),
  studentCap: z.coerce.number().int().min(1),
});
type FormData = z.infer<typeof schema>;

export function SchoolsClient({ rows }: { rows: Row[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const totalCommission = rows.reduce((s, r) => s + r.commissionSar, 0);
  const totalReferred = rows.reduce((s, r) => s + r.students, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Schools.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {isAr
              ? "كل شريك له رمز خصم واحد يوزّعه. من يشتري به يُسجَّل باسم الشريك، والشريك يستحق نسبة من أول عملية شراء لذلك الطالب فقط."
              : "Each partner has one discount code to hand out. Anyone who buys with it is recorded under that partner, who earns a percentage of that student's first purchase only."}
          </p>
        </div>
        <Button variant="cta" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="me-2 h-4 w-4" />{t("Schools.addNew")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={isAr ? "الشركاء" : "Partners"} value={String(rows.length)} />
        <Stat label={isAr ? "طلاب عن طريق الشركاء" : "Students referred"} value={String(totalReferred)} />
        <Stat
          label={isAr ? "إجمالي العمولات المستحقة" : "Total commission earned"}
          value={fmtSAR(totalCommission, locale as "ar" | "en")}
          accent
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Common.name")}</TableHead>
                <TableHead>{t("Schools.partnerType")}</TableHead>
                <TableHead>{isAr ? "رمز الخصم" : "Discount code"}</TableHead>
                <TableHead>{isAr ? "خصم الطالب" : "Student discount"}</TableHead>
                <TableHead>{isAr ? "عمولة الشريك" : "Partner commission"}</TableHead>
                <TableHead>{isAr ? "طلاب" : "Students"}</TableHead>
                <TableHead>{isAr ? "مبيعات" : "Sales"}</TableHead>
                <TableHead>{isAr ? "عمولة مستحقة" : "Commission owed"}</TableHead>
                <TableHead>{t("Common.status")}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="p-12 text-center text-muted-foreground">{t("Common.noData")}</TableCell></TableRow>
              ) : rows.map((r) => {
                const daysToRenew = Math.floor((new Date(r.contractEnd).getTime() - Date.now()) / 86400000);
                const renewalSoon = daysToRenew < 60 && daysToRenew >= 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{isAr ? r.nameAr : r.nameEn}</div>
                      <div className="text-xs text-muted-foreground">{r.contactName}</div>
                      {renewalSoon && (
                        <Badge variant="warning" className="mt-1">
                          <Calendar className="me-1 h-3 w-3" />{t("Schools.renewalSoon")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{t(`Schools.type_${r.partnerType}`)}</Badge></TableCell>
                    <TableCell>
                      {r.promoCode ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(r.promoCode!);
                            toast.success(isAr ? "نُسخ الرمز" : "Code copied");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs font-bold hover:bg-muted"
                          dir="ltr"
                        >
                          <span className="num">{r.promoCode}</span>
                          <Copy className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="num">{r.discountPercent}%</TableCell>
                    <TableCell className="num font-semibold">{r.commissionPercent}%</TableCell>
                    <TableCell className="num">{r.students}</TableCell>
                    <TableCell className="num">{fmtSAR(r.revenueSar, locale as "ar" | "en")}</TableCell>
                    <TableCell className="num font-semibold text-hajr-rose">
                      {fmtSAR(r.commissionSar, locale as "ar" | "en")}
                    </TableCell>
                    <TableCell><Badge variant={r.active ? "success" : "danger"}>{r.active ? t("Common.active") : t("Common.inactive")}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/schools/${r.id}`}>
                              <Eye className="me-2 h-4 w-4" />{t("Schools.viewDetails")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(r)}><Pencil className="me-2 h-4 w-4" />{t("Schools.edit")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            const res = await toggleSchoolActiveAction(r.id);
                            if (res.ok) toast.success(t("Common.success"));
                            else toast.error(res.error);
                            router.refresh();
                          }}><Power className="me-2 h-4 w-4" />{r.active ? t("Common.bulkDeactivate") : t("Common.bulkActivate")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {showAdd && <FormDialog mode="create" onClose={() => setShowAdd(false)} onDone={() => router.refresh()} />}
      {editing && <FormDialog mode="edit" existing={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`num text-2xl font-bold ${accent ? "text-hajr-rose" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FormDialog({ mode, existing, onClose, onDone }: { mode: "create" | "edit"; existing?: Row; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const isAr = useLocale() === "ar";
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          nameEn: existing.nameEn, nameAr: existing.nameAr,
          contactName: existing.contactName, contactEmail: existing.contactEmail, contactPhone: existing.contactPhone,
          city: existing.city,
          partnerType: existing.partnerType ?? "SCHOOL",
          contractStart: existing.contractStart, contractEnd: existing.contractEnd,
          discountPercent: existing.discountPercent,
          commissionPercent: existing.commissionPercent,
          studentCap: existing.studentCap,
        }
      : { city: "Hofuf", partnerType: "SCHOOL", studentCap: 50, discountPercent: 10, commissionPercent: 10 } as any,
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const res = mode === "create"
        ? await createSchoolAction(data as any)
        : await updateSchoolAction({ id: existing!.id, ...data } as any);
      if (!res.ok) { toast.error(res.error); return; }
      const code = mode === "create" ? (res.data as any)?.promoCode : null;
      toast.success(
        code
          ? (isAr ? `تم الحفظ — رمز الشريك: ${code}` : `Saved — partner code: ${code}`)
          : mode === "create" ? t("Schools.createSuccess") : t("Schools.updateSuccess")
      );
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("Schools.addNew") : t("Schools.edit")}</DialogTitle>
          <DialogDescription>
            {isAr
              ? "رمز الخصم يُنشأ تلقائياً عند الحفظ ولا يتغيّر بعدها — يتغيّر فقط مقدار الخصم."
              : "The discount code is minted automatically on save and never changes afterwards — only its percentage does."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Common.name") + " (EN)"} error={errors.nameEn?.message}><Input {...register("nameEn")} /></Field>
          <Field label={t("Common.name") + " (AR)"} error={errors.nameAr?.message}><Input dir="rtl" {...register("nameAr")} /></Field>
          <Field label={t("Schools.contact")} error={errors.contactName?.message}><Input {...register("contactName")} /></Field>
          <Field label={t("Common.email")} error={errors.contactEmail?.message}><Input type="email" {...register("contactEmail")} /></Field>
          <Field label={t("Common.phone")} error={errors.contactPhone?.message}><Input dir="ltr" {...register("contactPhone")} /></Field>
          <Field label={t("Common.city")}>
            <Select value={watch("city")} onValueChange={(v) => setValue("city", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("Schools.partnerType")} error={errors.partnerType?.message}>
            <Select value={watch("partnerType")} onValueChange={(v) => setValue("partnerType", v as PartnerType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PARTNER_TYPES.map((p) => <SelectItem key={p} value={p}>{t(`Schools.type_${p}`)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("Schools.studentCap")}><Input type="number" {...register("studentCap")} /></Field>
          <Field label={t("Schools.contractStart")} error={errors.contractStart?.message}><DateField {...register("contractStart")} /></Field>
          <Field label={t("Schools.contractEnd")} error={errors.contractEnd?.message}><DateField {...register("contractEnd")} /></Field>

          <Field
            label={isAr ? "خصم الطالب (%)" : "Student discount (%)"}
            error={errors.discountPercent?.message as string | undefined}
            hint={isAr ? "ما يخصمه الرمز عن كل من يشتري به" : "What the code takes off for every buyer"}
          >
            <Input type="number" min={0} max={100} step="1" {...register("discountPercent")} />
          </Field>
          <Field
            label={isAr ? "عمولة الشريك (%)" : "Partner commission (%)"}
            error={errors.commissionPercent?.message as string | undefined}
            hint={isAr ? "من أول عملية شراء للطالب فقط" : "On the student's first purchase only"}
          >
            <Input type="number" min={0} max={100} step="1" {...register("commissionPercent")} />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("Common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t("Common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
