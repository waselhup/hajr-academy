"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, MoreHorizontal, Power, Loader2, Calendar, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { createSchoolAction, updateSchoolAction, toggleSchoolActiveAction } from "../../_actions/schools";
import { fmtSAR } from "@/lib/format";

const CITIES = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar", "Tabuk", "Abha", "Hofuf", "Other"];

type Row = {
  id: string;
  nameEn: string; nameAr: string;
  contactName: string; contactEmail: string; contactPhone: string;
  city: string;
  contractStart: string; contractEnd: string;
  monthlyFeeSar: string;
  studentCap: number;
  active: boolean;
  students: number;
};

const schema = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  city: z.string(),
  contractStart: z.string(),
  contractEnd: z.string(),
  monthlyFeeSar: z.coerce.number().nonnegative(),
  studentCap: z.coerce.number().int().min(1),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function SchoolsClient({ rows }: { rows: Row[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Schools.title")}</h1>
          <p className="text-sm text-muted-foreground"><span className="num">{rows.length}</span></p>
        </div>
        <Button variant="cta" size="sm" onClick={() => setShowAdd(true)}><Plus className="me-2 h-4 w-4" />{t("Schools.addNew")}</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Common.name")}</TableHead>
              <TableHead>{t("Schools.contact")}</TableHead>
              <TableHead>{t("Common.city")}</TableHead>
              <TableHead>{t("Schools.contractStart")} – {t("Schools.contractEnd")}</TableHead>
              <TableHead>{t("Schools.monthlyFee")}</TableHead>
              <TableHead>{t("Common.students")}</TableHead>
              <TableHead>{t("Common.status")}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground p-12">{t("Common.noData")}</TableCell></TableRow>
            ) : rows.map((r) => {
              const daysToRenew = Math.floor((new Date(r.contractEnd).getTime() - Date.now()) / 86400000);
              const renewalSoon = daysToRenew < 60 && daysToRenew >= 0;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{locale === "ar" ? r.nameAr : r.nameEn}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>{r.contactName}</div>
                      <div className="text-muted-foreground">{r.contactEmail}</div>
                      <div className="text-muted-foreground num">{r.contactPhone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{r.city}</TableCell>
                  <TableCell className="text-xs num">
                    {r.contractStart} → {r.contractEnd}
                    {renewalSoon && <Badge variant="warning" className="ms-1"><Calendar className="me-1 h-3 w-3" />{t("Schools.renewalSoon")}</Badge>}
                  </TableCell>
                  <TableCell className="num">{fmtSAR(r.monthlyFeeSar, locale as "ar" | "en")}</TableCell>
                  <TableCell className="num">{r.students}/{r.studentCap}</TableCell>
                  <TableCell><Badge variant={r.active ? "success" : "danger"}>{r.active ? t("Common.active") : t("Common.inactive")}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/${locale}/admin/schools/${r.id}`}>
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
      </Card>

      {showAdd && <FormDialog mode="create" onClose={() => setShowAdd(false)} onDone={() => router.refresh()} />}
      {editing && <FormDialog mode="edit" existing={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />}
    </div>
  );
}

function FormDialog({ mode, existing, onClose, onDone }: { mode: "create" | "edit"; existing?: Row; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          nameEn: existing.nameEn, nameAr: existing.nameAr,
          contactName: existing.contactName, contactEmail: existing.contactEmail, contactPhone: existing.contactPhone,
          city: existing.city,
          contractStart: existing.contractStart, contractEnd: existing.contractEnd,
          monthlyFeeSar: Number(existing.monthlyFeeSar), studentCap: existing.studentCap,
        }
      : { city: "Hofuf", studentCap: 50, monthlyFeeSar: 15000 } as any,
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const res = mode === "create"
        ? await createSchoolAction(data as any)
        : await updateSchoolAction({ id: existing!.id, ...data } as any);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(mode === "create" ? t("Schools.createSuccess") : t("Schools.updateSuccess"));
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("Schools.addNew") : t("Schools.edit")}</DialogTitle>
          <DialogDescription>{t("Schools.title")}</DialogDescription>
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
          <Field label={t("Schools.contractStart")} error={errors.contractStart?.message}><Input type="date" {...register("contractStart")} /></Field>
          <Field label={t("Schools.contractEnd")} error={errors.contractEnd?.message}><Input type="date" {...register("contractEnd")} /></Field>
          <Field label={t("Schools.monthlyFee")}><Input type="number" step="100" {...register("monthlyFeeSar")} /></Field>
          <Field label={t("Schools.studentCap")}><Input type="number" {...register("studentCap")} /></Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("Common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t("Common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
