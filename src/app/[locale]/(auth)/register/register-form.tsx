"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { signIn } from "next-auth/react";
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
    name: z.string().min(2),
    nameAr: z.string().optional(),
    email: z.string().email(),
    phone: z.string().regex(/^(\+966|0)?5\d{8}$/, "Invalid Saudi phone"),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    role: z.enum(["STUDENT", "PARENT"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "STUDENT" },
  });

  const role = watch("role");

  const onSubmit = (data: FormData) => {
    setServerError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          nameAr: data.nameAr,
          phone: data.phone,
          role: data.role,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setServerError(j.error ?? "Failed");
        toast.error(j.error ?? t("Common.error"));
        return;
      }
      toast.success(t("Auth.accountCreated"));
      const signin = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (signin?.error) {
        router.push("/login");
        return;
      }
      router.replace(data.role === "PARENT" ? "/parent" : "/student");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("Auth.iAm")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue("role", "STUDENT")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              role === "STUDENT"
                ? "border-hajr-rose bg-hajr-rose/10 text-hajr-navy"
                : "border-hajr-gray-200 text-hajr-gray-500 hover:border-hajr-gray-300"
            }`}
          >
            {t("Auth.student")}
          </button>
          <button
            type="button"
            onClick={() => setValue("role", "PARENT")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              role === "PARENT"
                ? "border-hajr-rose bg-hajr-rose/10 text-hajr-navy"
                : "border-hajr-gray-200 text-hajr-gray-500 hover:border-hajr-gray-300"
            }`}
          >
            {t("Auth.parent")}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">{t("Auth.fullName")}</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{t("Validation.required")}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="nameAr">{t("Auth.fullNameAr")}</Label>
        <Input id="nameAr" {...register("nameAr")} dir="rtl" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("Common.email")}</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{t("Validation.emailInvalid")}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t("Common.phone")}</Label>
        <Input id="phone" type="tel" placeholder="05XXXXXXXX" dir="ltr" {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{t("Validation.phoneInvalid")}</p>}
      </div>
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
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" variant="cta" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("Auth.registerNow")}
      </Button>
    </form>
  );
}
