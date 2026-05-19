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
import { createParentAction, updateParentAction } from "../../_actions/parents";

const schema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
  email: z.string().email(),
  phone: z.string().regex(/^(\+966|0)?5\d{8}$/),
  occupation: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function ParentFormDialog({ mode, existing, onClose, onDone }: { mode: "create" | "edit"; existing?: any; onClose: () => void; onDone: () => void }) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? { name: existing.name, nameAr: existing.nameAr ?? "", email: existing.email, phone: existing.phone ?? "", occupation: existing.profile?.occupation ?? "" }
      : {},
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const res = mode === "create"
        ? await createParentAction(data as any)
        : await updateParentAction({ id: existing.id, ...data } as any);
      if (!res.ok) { toast.error(res.error); return; }
      if (mode === "create" && "data" in res && (res.data as any).inviteCode) toast.success(`${t("Parents.createSuccess")} — ${t("Parents.inviteCode")}: ${(res.data as any).inviteCode}`);
      else toast.success(t("Common.success"));
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("Parents.addNew") : t("Parents.edit")}</DialogTitle>
          <DialogDescription>{t("Parents.title")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Common.name")} error={errors.name?.message}><Input {...register("name")} /></Field>
          <Field label={t("Common.nameAr")}><Input dir="rtl" {...register("nameAr")} /></Field>
          <Field label={t("Common.email")} error={errors.email?.message}><Input type="email" {...register("email")} disabled={mode === "edit"} /></Field>
          <Field label={t("Common.phone")} error={errors.phone?.message}><Input dir="ltr" placeholder="05XXXXXXXX" {...register("phone")} /></Field>
          <div className="sm:col-span-2"><Field label={t("Parents.occupation")}><Input {...register("occupation")} /></Field></div>
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
