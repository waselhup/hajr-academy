"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Loader2, BookOpen, GraduationCap, FlaskConical, School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { updateProgramAction, toggleProgramActiveAction } from "../../_actions/programs";
import { fmtSAR } from "@/lib/format";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  STEP_PREP: BookOpen,
  PRIVATE: GraduationCap,
  UNI_PREP: GraduationCap,
  SCHOOL: School,
  ENGLISH_LAB: FlaskConical,
};

type Row = {
  id: string; code: string;
  nameEn: string; nameAr: string;
  descriptionEn: string; descriptionAr: string;
  type: string;
  defaultPriceSar: string;
  durationHours: number | null;
  active: boolean;
  classesCount: number;
};

const schema = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  descriptionEn: z.string().min(2),
  descriptionAr: z.string().min(2),
  defaultPriceSar: z.coerce.number().nonnegative(),
  durationHours: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
});
type FormData = z.infer<typeof schema>;

export function ProgramsClient({ rows }: { rows: Row[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("ProgramsPage.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("Common.programs")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => {
          const Icon = ICONS[p.code] ?? BookOpen;
          return (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${p.active ? "bg-hajr-hover/40" : "bg-gray-100"}`}>
                    <Icon className="h-5 w-5 text-brand-navy" />
                  </div>
                  <Switch
                    checked={p.active}
                    onCheckedChange={async () => {
                      const res = await toggleProgramActiveAction(p.id);
                      if (res.ok) toast.success(t("ProgramsPage.toggleSuccess"));
                      else toast.error(res.error);
                      router.refresh();
                    }}
                  />
                </div>
                <CardTitle className="mt-3">{locale === "ar" ? p.nameAr : p.nameEn}</CardTitle>
                <CardDescription className="line-clamp-2">{locale === "ar" ? p.descriptionAr : p.descriptionEn}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("ProgramsPage.defaultPrice")}</div>
                    <div className="font-medium num">{fmtSAR(p.defaultPriceSar, locale as "ar" | "en")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("ProgramsPage.durationHours")}</div>
                    <div className="font-medium num">{p.durationHours ?? "∞"}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="info">{p.type}</Badge>
                  <span className="text-xs text-muted-foreground"><span className="num">{p.classesCount}</span> {t("ProgramsPage.classesCount")}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(p)}>
                  <Pencil className="me-2 h-4 w-4" />{t("ProgramsPage.edit")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <EditDialog
          program={editing}
          onClose={() => setEditing(null)}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

function EditDialog({ program, onClose, onDone }: { program: Row; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameEn: program.nameEn,
      nameAr: program.nameAr,
      descriptionEn: program.descriptionEn,
      descriptionAr: program.descriptionAr,
      defaultPriceSar: Number(program.defaultPriceSar),
      durationHours: program.durationHours ?? "",
    } as any,
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const res = await updateProgramAction({
        id: program.id,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        defaultPriceSar: data.defaultPriceSar,
        durationHours: typeof data.durationHours === "number" ? data.durationHours : null,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(t("ProgramsPage.updateSuccess"));
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("ProgramsPage.edit")}</DialogTitle>
          <DialogDescription>{program.code}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Common.name") + " (EN)"} error={errors.nameEn?.message}><Input {...register("nameEn")} /></Field>
          <Field label={t("Common.name") + " (AR)"} error={errors.nameAr?.message}><Input dir="rtl" {...register("nameAr")} /></Field>
          <div className="sm:col-span-2"><Field label="Description (EN)" error={errors.descriptionEn?.message}><Textarea rows={3} {...register("descriptionEn")} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description (AR)" error={errors.descriptionAr?.message}><Textarea rows={3} dir="rtl" {...register("descriptionAr")} /></Field></div>
          <Field label={t("ProgramsPage.defaultPrice")} error={errors.defaultPriceSar?.message}><Input type="number" step="10" {...register("defaultPriceSar")} /></Field>
          <Field label={t("ProgramsPage.durationHours")}><Input type="number" {...register("durationHours")} /></Field>
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
