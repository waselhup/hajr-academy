"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClassAction, updateClassAction } from "../../_actions/classes";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

const schema = z.object({
  programId: z.string().min(1),
  name: z.string().min(2),
  nameAr: z.string().optional(),
  cohortCode: z.string().optional(),
  teacherId: z.string().min(1),
  scheduleDays: z.array(z.enum(DAYS)).min(1),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).default(60),
  maxStudents: z.coerce.number().int().min(1).default(6),
  genderRestriction: z.enum(["MALE", "FEMALE", ""]).optional(),
  allowCrossGenderChat: z.boolean().default(false),
  pricePerMonth: z.coerce.number().nonnegative().default(0),
  startDate: z.string(),
  endDate: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function ClassFormDialog({
  mode, existing, programs, teachers, onClose, onDone,
}: {
  mode: "create" | "edit"; existing?: any;
  programs: { id: string; code: string; nameEn: string; nameAr: string; defaultPriceSar: string }[];
  teachers: { id: string; name: string; nameAr: string | null }[];
  onClose: () => void; onDone: () => void;
}) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          programId: existing.program?.id ?? "",
          name: existing.name,
          nameAr: existing.nameAr ?? "",
          cohortCode: existing.cohortCode,
          teacherId: existing.teacher?.id ?? "",
          scheduleDays: existing.scheduleDays,
          timeSlot: existing.timeSlot,
          durationMinutes: existing.durationMinutes,
          maxStudents: existing.maxStudents,
          genderRestriction: existing.genderRestriction ?? "",
          allowCrossGenderChat: existing.allowCrossGenderChat ?? false,
          pricePerMonth: Number(existing.pricePerMonth),
          startDate: existing.startDate,
          endDate: existing.endDate ?? "",
        }
      : ({ scheduleDays: [], timeSlot: "18:00", durationMinutes: 60, maxStudents: 6, pricePerMonth: 400, startDate: new Date().toISOString().slice(0, 10), allowCrossGenderChat: false } as any),
  });

  const days = watch("scheduleDays") ?? [];

  function toggleDay(d: typeof DAYS[number]) {
    setValue("scheduleDays", days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  }

  function onProgramChange(id: string) {
    setValue("programId", id);
    const p = programs.find((x) => x.id === id);
    if (p && Number(watch("pricePerMonth")) === 0) setValue("pricePerMonth", Number(p.defaultPriceSar));
  }

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const payload: any = { ...data, endDate: data.endDate || null };
      const res = mode === "create"
        ? await createClassAction(payload)
        : await updateClassAction({ id: existing.id, ...payload });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(mode === "create" ? t("Classes.createSuccess") : t("Classes.updateSuccess"));
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("Classes.addNew") : t("Classes.edit")}</DialogTitle>
          <DialogDescription>{t("Classes.title")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Nav.programs")} error={errors.programId?.message}>
            <Select value={watch("programId")} onValueChange={onProgramChange}>
              <SelectTrigger><SelectValue placeholder={t("Common.search")} /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nameEn}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("Classes.teacher")} error={errors.teacherId?.message}>
            <Select value={watch("teacherId")} onValueChange={(v) => setValue("teacherId", v)}>
              <SelectTrigger><SelectValue placeholder={t("Common.search")} /></SelectTrigger>
              <SelectContent>
                {teachers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("Common.name") + " (EN)"} error={errors.name?.message}><Input {...register("name")} /></Field>
          <Field label={t("Common.nameAr")}><Input dir="rtl" {...register("nameAr")} /></Field>
          <Field label={t("Classes.cohortCode")} error={errors.cohortCode?.message}>
            <Input {...register("cohortCode")} placeholder="auto" />
          </Field>
          <Field label={t("Classes.timeSlot")} error={errors.timeSlot?.message}>
            <Input type="time" dir="ltr" {...register("timeSlot")} />
          </Field>
          <Field label={t("Classes.duration")}><Input type="number" {...register("durationMinutes")} /></Field>
          <Field label={t("Classes.maxStudents")}><Input type="number" {...register("maxStudents")} /></Field>
          <Field label={t("Classes.pricePerMonth")}><Input type="number" step="50" {...register("pricePerMonth")} /></Field>
          <Field label={t("Classes.genderRestriction")}>
            <Select value={watch("genderRestriction") ?? ""} onValueChange={(v) => setValue("genderRestriction", v as any)}>
              <SelectTrigger><SelectValue placeholder={t("Common.all")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("Common.all")}</SelectItem>
                <SelectItem value="MALE">{t("Common.male")}</SelectItem>
                <SelectItem value="FEMALE">{t("Common.female")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("Classes.startDate")} error={errors.startDate?.message}><Input type="date" {...register("startDate")} /></Field>
          <Field label={t("Classes.endDate")}><Input type="date" {...register("endDate")} /></Field>
          <div className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
            <Label>{t("Classes.allowCrossGenderChat")}</Label>
            <Switch checked={watch("allowCrossGenderChat") ?? false} onCheckedChange={(c) => setValue("allowCrossGenderChat", !!c)} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("Classes.scheduleDays")}</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {DAYS.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={days.includes(d)} onCheckedChange={() => toggleDay(d)} />
                  {t("Days." + d as any)}
                </label>
              ))}
            </div>
            {errors.scheduleDays && <p className="text-xs text-destructive mt-1">{errors.scheduleDays.message}</p>}
          </div>
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
