"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Loader2, BookOpen, GraduationCap, FlaskConical, School, Plus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { updateProgramAction, toggleProgramActiveAction, createProgramAction } from "../../_actions/programs";
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
  durationHours: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
});
type FormData = z.infer<typeof schema>;

export function ProgramsClient({ rows }: { rows: Row[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("ProgramsPage.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("Common.programs")}</p>
        </div>
        <Button variant="cta" onClick={() => setCreating(true)}>
          <Plus className="me-2 h-4 w-4" />
          {locale === "ar" ? "برنامج جديد" : "New program"}
        </Button>
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(p)}>
                    <Pencil className="me-2 h-4 w-4" />{t("ProgramsPage.edit")}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/${locale}/admin/openings`)}>
                    <Users className="me-2 h-4 w-4" />{t("Openings.viewApplicants")}
                  </Button>
                </div>
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
      {creating && (
        <CreateDialog
          locale={locale}
          onClose={() => setCreating(false)}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

const createFormSchema = z.object({
  code: z.string().min(2).max(40),
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  descriptionEn: z.string().min(2),
  descriptionAr: z.string().min(2),
  type: z.enum(["GROUP", "PRIVATE", "B2B", "SELF_STUDY"]),
  durationHours: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
  audienceType: z.enum(["ALL_INTERNAL", "INTERNAL_THEN_APPLICANTS", "APPLICANTS_ONLY", "EVERYONE"]),
});
type CreateFormData = z.infer<typeof createFormSchema>;

function CreateDialog({ locale, onClose, onDone }: { locale: string; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { type: "GROUP", durationHours: "", audienceType: "ALL_INTERNAL" } as any,
  });

  const onSubmit = (data: CreateFormData) => {
    startTransition(async () => {
      const res = await createProgramAction({
        code: data.code,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        type: data.type,
        durationHours: typeof data.durationHours === "number" ? data.durationHours : null,
        audienceType: data.audienceType,
      });
      if (!res.ok) {
        toast.error(res.error === "CODE_EXISTS" ? (isAr ? "هذا الرمز مستخدم مسبقاً" : "Code already exists") : res.error);
        return;
      }
      toast.success(isAr ? "تم إنشاء البرنامج" : "Program created");
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAr ? "برنامج جديد" : "New program"}</DialogTitle>
          <DialogDescription>{isAr ? "أضف برنامجاً جديداً للأكاديمية" : "Add a new academy program"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={isAr ? "الرمز (حروف إنجليزية)" : "Code"} error={errors.code?.message}>
            <Input dir="ltr" placeholder="KIDS_ENGLISH" {...register("code")} />
          </Field>
          <Field label={isAr ? "النوع" : "Type"} error={errors.type?.message}>
            <select className="w-full rounded-md border border-hajr-border bg-white p-2 min-h-[40px]" {...register("type")}>
              <option value="GROUP">{isAr ? "مجموعة" : "Group"}</option>
              <option value="PRIVATE">{isAr ? "فردي" : "Private"}</option>
              <option value="B2B">{isAr ? "مدارس (B2B)" : "School (B2B)"}</option>
              <option value="SELF_STUDY">{isAr ? "تعلّم ذاتي" : "Self-study"}</option>
            </select>
          </Field>
          <Field label={t("Common.name") + " (EN)"} error={errors.nameEn?.message}><Input {...register("nameEn")} /></Field>
          <Field label={t("Common.name") + " (AR)"} error={errors.nameAr?.message}><Input dir="rtl" {...register("nameAr")} /></Field>
          <div className="sm:col-span-2"><Field label="Description (EN)" error={errors.descriptionEn?.message}><Textarea rows={2} {...register("descriptionEn")} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description (AR)" error={errors.descriptionAr?.message}><Textarea rows={2} dir="rtl" {...register("descriptionAr")} /></Field></div>
          <Field label={t("ProgramsPage.durationHours")}><Input type="number" {...register("durationHours")} /></Field>
          <div className="sm:col-span-2">
            <Field label={t("Openings.audienceTitle")}>
              <select className="w-full rounded-md border border-hajr-border bg-white p-2 min-h-[40px]" {...register("audienceType")}>
                <option value="ALL_INTERNAL">{t("Openings.audienceType_ALL_INTERNAL")}</option>
                <option value="INTERNAL_THEN_APPLICANTS">{t("Openings.audienceType_INTERNAL_THEN_APPLICANTS")}</option>
                <option value="APPLICANTS_ONLY">{t("Openings.audienceType_APPLICANTS_ONLY")}</option>
                <option value="EVERYONE">{t("Openings.audienceType_EVERYONE")}</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">{t("Openings.audienceCreateHint")}</p>
            </Field>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("Common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{isAr ? "إنشاء" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
