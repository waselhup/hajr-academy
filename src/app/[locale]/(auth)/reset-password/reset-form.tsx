"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "must match" });

type FormData = z.infer<typeof schema>;

export function ResetForm() {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = () => {
    startTransition(async () => {
      // Full reset flow is wired in Phase 8 (email tokens). This page accepts the
      // user's new password and shows success; backend issues new hash via reset token.
      await new Promise((r) => setTimeout(r, 400));
      toast.success(t("Common.success"));
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t("Common.password")}</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{t("Validation.passwordMin")}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("Auth.confirmPassword")}</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{t("Validation.passwordsMatch")}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("Auth.resetPassword")}
      </Button>
    </form>
  );
}
