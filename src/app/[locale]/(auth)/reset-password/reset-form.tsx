"use client";
import { Suspense, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "must match",
  });

type FormData = z.infer<typeof schema>;

// Wrapped in <Suspense> because the inner form reads the ?token= query param.
export function ResetForm() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <ResetFormInner />
    </Suspense>
  );
}

function ResetFormInner() {
  const t = useTranslations();
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // No token → the link is malformed/expired. Send them back to "forgot".
  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-hajr-error" />
        <p className="text-sm text-hajr-gray-500">
          {isAr
            ? "رابط إعادة التعيين غير صالح أو منتهٍ. اطلب رابطاً جديداً."
            : "This reset link is invalid or expired. Request a new one."}
        </p>
        <Button variant="cta" className="w-full" onClick={() => router.push("/forgot-password")}>
          {t("Auth.sendResetLink")}
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-hajr-success" />
        <p className="text-sm text-hajr-gray-500">
          {isAr ? "تم تحديث كلمة المرور بنجاح." : "Your password has been updated."}
        </p>
        <Button variant="cta" className="w-full" onClick={() => router.push("/login")}>
          {t("Auth.loginNow")}
        </Button>
      </div>
    );
  }

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: data.password }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) {
          setDone(true);
          toast.success(t("Common.success"));
        } else if (json.error === "TOKEN_INVALID_OR_EXPIRED") {
          toast.error(
            isAr
              ? "رابط إعادة التعيين غير صالح أو منتهٍ."
              : "This reset link is invalid or expired."
          );
        } else {
          toast.error(t("Common.error"));
        }
      } catch {
        toast.error(t("Common.error"));
      }
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
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{t("Validation.passwordsMatch")}</p>
        )}
      </div>
      <Button type="submit" variant="cta" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("Auth.resetPassword")}
      </Button>
    </form>
  );
}
