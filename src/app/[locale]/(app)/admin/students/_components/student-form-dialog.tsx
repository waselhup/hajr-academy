"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/western-fields";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { createStudentAction, updateStudentAction } from "../../_actions/students";

const formSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
  email: z.string().email(),
  phone: z.string().regex(/^(\+966|0)?5\d{8}$/, "Invalid Saudi phone"),
  birthDate: z.string().optional(),
  gradeLevel: z.string().optional(),
  englishLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  gender: z.enum(["MALE", "FEMALE"]),
  schoolId: z.string().optional(),
  learningGoals: z.string().optional(),
  activePackage: z.enum(["ESSENTIAL", "INTEGRATED", "PRIVATE", "SCHOOL", ""]).optional(),
  packageStartedAt: z.string().optional(),
  packageExpiresAt: z.string().optional(),
  subscriptionDate: z.string().optional(),
  studentPhone: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  residenceAddress: z.string().optional(),
  englishTeacherName: z.string().optional(),
  importantNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function StudentFormDialog({
  mode, existing, schools, onClose, onDone,
}: {
  mode: "create" | "edit";
  existing?: any;
  schools: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const {
    register, handleSubmit, setValue, watch, formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existing
      ? {
          name: existing.name,
          nameAr: existing.nameAr ?? "",
          email: existing.email,
          phone: existing.phone ?? "",
          birthDate: existing.profile?.birthDate?.slice(0, 10) ?? "",
          gradeLevel: existing.profile?.gradeLevel ?? "",
          englishLevel: existing.profile?.englishLevel ?? "BEGINNER",
          gender: existing.profile?.gender ?? "MALE",
          schoolId: existing.profile?.schoolId ?? "",
          learningGoals: existing.profile?.learningGoals ?? "",
          activePackage: existing.profile?.activePackage ?? "",
          packageStartedAt: existing.profile?.packageStartedAt?.slice(0, 10) ?? "",
          packageExpiresAt: existing.profile?.packageExpiresAt?.slice(0, 10) ?? "",
          subscriptionDate: existing.profile?.subscriptionDate?.slice(0, 10) ?? "",
          studentPhone: existing.profile?.studentPhone ?? "",
          guardianName: existing.profile?.guardianName ?? "",
          guardianPhone: existing.profile?.guardianPhone ?? "",
          residenceAddress: existing.profile?.residenceAddress ?? "",
          englishTeacherName: existing.profile?.englishTeacherName ?? "",
          importantNotes: existing.profile?.importantNotes ?? "",
        }
      : { englishLevel: "BEGINNER", gender: "MALE" } as any,
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const payload: any = { ...data };
      if (payload.activePackage === "") delete payload.activePackage;
      if (!payload.schoolId) payload.schoolId = null;
      const res = mode === "create"
        ? await createStudentAction(payload)
        : await updateStudentAction({ id: existing.id, ...payload });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "create" ? t("Students.createSuccess") : t("Students.updateSuccess"));
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("Students.addNew") : t("Students.edit")}</DialogTitle>
          <DialogDescription>{t("Students.title")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Common.name")} error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label={t("Common.nameAr")} error={errors.nameAr?.message}>
            <Input dir="rtl" {...register("nameAr")} />
          </Field>
          <Field label={t("Common.email")} error={errors.email?.message}>
            <Input type="email" {...register("email")} disabled={mode === "edit"} />
          </Field>
          <Field label={t("Common.phone")} error={errors.phone?.message}>
            <Input dir="ltr" placeholder="05XXXXXXXX" {...register("phone")} />
          </Field>
          <Field label={t("Students.birthDate")}>
            <DateField {...register("birthDate")} />
          </Field>
          <Field label={t("Students.gradeLevel")}>
            <Input {...register("gradeLevel")} />
          </Field>

          <Field label={t("Common.gender")}>
            <Select defaultValue={watch("gender")} onValueChange={(v) => setValue("gender", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">{t("Common.male")}</SelectItem>
                <SelectItem value="FEMALE">{t("Common.female")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Common.level")}>
            <Select defaultValue={watch("englishLevel")} onValueChange={(v) => setValue("englishLevel", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BEGINNER">{t("Levels.BEGINNER")}</SelectItem>
                <SelectItem value="INTERMEDIATE">{t("Levels.INTERMEDIATE")}</SelectItem>
                <SelectItem value="ADVANCED">{t("Levels.ADVANCED")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Common.school")}>
            <Select defaultValue={watch("schoolId") ?? ""} onValueChange={(v) => setValue("schoolId", v === "_none_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("Common.all")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">{t("Common.noData")}</SelectItem>
                {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Common.package")}>
            <Select defaultValue={(watch("activePackage") ?? "") as string} onValueChange={(v) => setValue("activePackage", (v === "_none_" ? "" : v) as any)}>
              <SelectTrigger><SelectValue placeholder={t("Common.all")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">{t("Common.noData")}</SelectItem>
                <SelectItem value="ESSENTIAL">{t("Packages.ESSENTIAL")}</SelectItem>
                <SelectItem value="INTEGRATED">{t("Packages.INTEGRATED")}</SelectItem>
                <SelectItem value="PRIVATE">{t("Packages.PRIVATE")}</SelectItem>
                <SelectItem value="SCHOOL">{t("Packages.SCHOOL")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Students.packageStartedAt")}>
            <DateField {...register("packageStartedAt")} />
          </Field>
          <Field label={t("Students.packageExpiresAt")}>
            <DateField {...register("packageExpiresAt")} />
          </Field>

          <Field label={t("Students.subscriptionDate")}>
            <DateField {...register("subscriptionDate")} />
          </Field>
          <Field label={t("Students.studentPhone")}>
            <Input dir="ltr" placeholder="05XXXXXXXX" {...register("studentPhone")} />
          </Field>
          <Field label={t("Students.guardianName")}>
            <Input {...register("guardianName")} />
          </Field>
          <Field label={t("Students.guardianPhone")}>
            <Input dir="ltr" placeholder="05XXXXXXXX" {...register("guardianPhone")} />
          </Field>
          <Field label={t("Students.englishTeacherName")}>
            <Input {...register("englishTeacherName")} />
          </Field>
          <Field label={t("Students.residenceAddress")}>
            <Input {...register("residenceAddress")} />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t("Students.learningGoals")}>
              <Textarea rows={3} {...register("learningGoals")} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label={t("Students.importantNotes")}>
              <Textarea rows={3} {...register("importantNotes")} />
            </Field>
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
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
