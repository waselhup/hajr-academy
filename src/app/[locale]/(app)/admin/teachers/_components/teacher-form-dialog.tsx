"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createTeacherAction, updateTeacherAction } from "../../_actions/teachers";
import { TeacherCredentialsDialog } from "./teacher-credentials-dialog";

const SPEC = ["STEP", "IELTS", "UNIVERSITY_PREP", "GENERAL", "BUSINESS"] as const;
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
const AGE_GROUPS = ["KIDS", "TEENS", "ADULTS", "ALL_AGES"] as const;

const schema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
  email: z.string().email(),
  phone: z.string().regex(/^(\+966|0)?5\d{8}$/),
  bio: z.string().optional(),
  specializations: z.array(z.enum(SPEC)).default([]),
  salaryBase: z.coerce.number().nonnegative().default(0),
  hourlyRate: z.coerce.number().nonnegative().default(0),
  salaryBaseUsd: z.coerce.number().nonnegative().optional(),
  hourlyRateUsd: z.coerce.number().nonnegative().optional(),
  groupRateSar: z.coerce.number().nonnegative().optional(),
  groupRateUsd: z.coerce.number().nonnegative().optional(),
  oneToOneRateSar: z.coerce.number().nonnegative().optional(),
  oneToOneRateUsd: z.coerce.number().nonnegative().optional(),
  zoomAccountId: z.string().optional(),
  ageGroup: z.string().optional(),
  availabilityDays: z.array(z.enum(DAYS)).default([]),
  availabilityHours: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

type ZoomAccountOpt = { id: string; label: string; capacity: number; teacherCount: number };

export function TeacherFormDialog({ mode, existing, zoomAccounts = [], onClose, onDone }: { mode: "create" | "edit"; existing?: any; zoomAccounts?: ZoomAccountOpt[]; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const isAr = useLocale() === "ar";
  const [isPending, startTransition] = useTransition();
  const [creds, setCreds] = useState<{ username: string; tempPassword: string } | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          name: existing.name,
          nameAr: existing.nameAr ?? "",
          email: existing.email,
          phone: existing.phone ?? "",
          bio: existing.profile?.bio ?? "",
          specializations: existing.profile?.specializations ?? [],
          salaryBase: Number(existing.profile?.salaryBase ?? 0),
          hourlyRate: Number(existing.profile?.hourlyRate ?? 0),
          salaryBaseUsd: existing.profile?.salaryBaseUsd != null ? Number(existing.profile.salaryBaseUsd) : undefined,
          hourlyRateUsd: existing.profile?.hourlyRateUsd != null ? Number(existing.profile.hourlyRateUsd) : undefined,
          groupRateSar: existing.profile?.groupRateSar != null ? Number(existing.profile.groupRateSar) : undefined,
          groupRateUsd: existing.profile?.groupRateUsd != null ? Number(existing.profile.groupRateUsd) : undefined,
          oneToOneRateSar: existing.profile?.oneToOneRateSar != null ? Number(existing.profile.oneToOneRateSar) : undefined,
          oneToOneRateUsd: existing.profile?.oneToOneRateUsd != null ? Number(existing.profile.oneToOneRateUsd) : undefined,
          zoomAccountId: existing.profile?.zoomAccountId ?? "",
          ageGroup: existing.profile?.ageGroup ?? "",
          availabilityDays: existing.profile?.availabilityDays ?? [],
          availabilityHours: existing.profile?.availabilityHours ?? "",
        }
      : { specializations: [], salaryBase: 0, hourlyRate: 0, availabilityDays: [] } as any,
  });

  const specs = watch("specializations") ?? [];
  const availDays = watch("availabilityDays") ?? [];

  function toggleSpec(s: typeof SPEC[number]) {
    setValue("specializations", specs.includes(s) ? specs.filter((x) => x !== s) : [...specs, s]);
  }

  function toggleDay(d: typeof DAYS[number]) {
    setValue("availabilityDays", availDays.includes(d) ? availDays.filter((x) => x !== d) : [...availDays, d]);
  }

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const payload = {
        ...data,
        zoomAccountId: data.zoomAccountId && data.zoomAccountId !== "__none__" ? data.zoomAccountId : null,
        salaryBaseUsd: Number.isFinite(data.salaryBaseUsd as number) ? data.salaryBaseUsd : null,
        hourlyRateUsd: Number.isFinite(data.hourlyRateUsd as number) ? data.hourlyRateUsd : null,
        groupRateSar: Number.isFinite(data.groupRateSar as number) ? data.groupRateSar : null,
        groupRateUsd: Number.isFinite(data.groupRateUsd as number) ? data.groupRateUsd : null,
        oneToOneRateSar: Number.isFinite(data.oneToOneRateSar as number) ? data.oneToOneRateSar : null,
        oneToOneRateUsd: Number.isFinite(data.oneToOneRateUsd as number) ? data.oneToOneRateUsd : null,
      };
      if (mode === "create") {
        const res = await createTeacherAction(payload as any);
        if (!res.ok) { toast.error(zoomErr(res.error, isAr) ?? res.error); return; }
        toast.success(t("Teachers.createSuccess"));
        onDone();
        // Keep this component mounted so the one-time credentials show.
        setCreds(res.data.credentials);
        return;
      }
      const res = await updateTeacherAction({ id: existing.id, ...payload } as any);
      if (!res.ok) { toast.error(zoomErr(res.error, isAr) ?? res.error); return; }
      toast.success(t("Teachers.updateSuccess"));
      onDone();
      onClose();
    });
  };

  return (
    <>
    <Dialog open={!creds} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("Teachers.addNew") : t("Teachers.edit")}</DialogTitle>
          <DialogDescription>{t("Teachers.title")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Common.name")} error={errors.name?.message}><Input {...register("name")} /></Field>
          <Field label={t("Common.nameAr")}><Input dir="rtl" {...register("nameAr")} /></Field>
          <Field label={t("Common.email")} error={errors.email?.message}>
            <Input type="email" {...register("email")} disabled={mode === "edit"} />
          </Field>
          <Field label={t("Common.phone")} error={errors.phone?.message}>
            <Input dir="ltr" placeholder="05XXXXXXXX" {...register("phone")} />
          </Field>
          <Field label={t("Teachers.salaryBase")}><Input type="number" step="50" {...register("salaryBase")} /></Field>
          <Field label={t("Teachers.salaryBaseUsd")}><Input type="number" step="50" dir="ltr" placeholder="USD" {...register("salaryBaseUsd")} /></Field>
          <Field label={t("AdminPay.rateLabel")}><Input type="number" step="5" {...register("hourlyRate")} /></Field>
          <Field label={t("Teachers.hourlyRateUsd")}><Input type="number" step="5" dir="ltr" placeholder="USD" {...register("hourlyRateUsd")} /></Field>
          <Field label={t("Teachers.groupRateSar")}><Input type="number" step="5" {...register("groupRateSar")} /></Field>
          <Field label={t("Teachers.groupRateUsd")}><Input type="number" step="5" dir="ltr" placeholder="USD" {...register("groupRateUsd")} /></Field>
          <Field label={t("Teachers.oneToOneRateSar")}><Input type="number" step="5" {...register("oneToOneRateSar")} /></Field>
          <Field label={t("Teachers.oneToOneRateUsd")}><Input type="number" step="5" dir="ltr" placeholder="USD" {...register("oneToOneRateUsd")} /></Field>
          <Field label={isAr ? "حساب Zoom" : "Zoom account"}>
            <Select value={watch("zoomAccountId") || "__none__"} onValueChange={(v) => setValue("zoomAccountId", v)}>
              <SelectTrigger><SelectValue placeholder={isAr ? "بدون" : "None"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{isAr ? "بدون حساب" : "No account"}</SelectItem>
                {zoomAccounts.map((a) => {
                  const isCurrent = a.id === existing?.profile?.zoomAccountId;
                  const full = a.teacherCount >= a.capacity && !isCurrent;
                  return (
                    <SelectItem key={a.id} value={a.id} disabled={full}>
                      {a.label} ({a.teacherCount}/{a.capacity}){full ? (isAr ? " — ممتلئ" : " — full") : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Label>{t("Teachers.specializations")}</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {SPEC.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={specs.includes(s)} onCheckedChange={() => toggleSpec(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <Field label={t("Teachers.ageGroup")}>
            <Select value={watch("ageGroup") || ""} onValueChange={(v) => setValue("ageGroup", v)}>
              <SelectTrigger><SelectValue placeholder={t("Common.all")} /></SelectTrigger>
              <SelectContent>
                {AGE_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{t("Teachers.ageGroup_" + g as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("Teachers.availabilityHours")}>
            <Input dir="ltr" placeholder="4:00 PM - 9:00 PM" {...register("availabilityHours")} />
          </Field>
          <div className="sm:col-span-2">
            <Label>{t("Teachers.availabilityDays")}</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {DAYS.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={availDays.includes(d)} onCheckedChange={() => toggleDay(d)} />
                  {t("Days." + d as any)}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("Teachers.bio")}><Textarea rows={3} {...register("bio")} /></Field>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("Common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("Common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {creds && (
      <TeacherCredentialsDialog
        username={creds.username}
        tempPassword={creds.tempPassword}
        onClose={() => { setCreds(null); onClose(); }}
      />
    )}
    </>
  );
}

function zoomErr(code: string, isAr: boolean): string | null {
  if (code === "ZOOM_ACCOUNT_FULL") return isAr ? "حساب Zoom ممتلئ (تم بلوغ الحد الأقصى للمعلّمين)." : "That Zoom account is full (max teachers reached).";
  if (code === "ZOOM_ACCOUNT_NOT_FOUND") return isAr ? "حساب Zoom غير موجود." : "Zoom account not found.";
  return null;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
