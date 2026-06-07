"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
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
    // Name is collected as three required parts and composed into `name` on
    // submit (the backend still expects a single `name`). Each part required.
    firstName: z.string().trim().min(1),
    middleName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
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
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Pick up ?ref= or sessionStorage persisted code.
  useEffect(() => {
    const fromUrl = searchParams.get("ref");
    if (fromUrl) {
      const code = fromUrl.toUpperCase().trim();
      try { sessionStorage.setItem("hajr_ref", code); } catch {}
      setReferralCode(code);
      return;
    }
    try {
      const cached = sessionStorage.getItem("hajr_ref");
      if (cached) setReferralCode(cached);
    } catch {}
  }, [searchParams]);

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
    // Compose the three required parts into the single `name` the backend stores.
    const name = [data.firstName, data.middleName, data.lastName]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" ");
    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name,
          nameAr: data.nameAr,
          phone: data.phone,
          role: data.role,
          referralCode: referralCode ?? undefined,
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
      {referralCode && (
        <div className="rounded-lg border border-hajr-mint bg-hajr-mint/15 px-3 py-2 text-xs text-hajr-deep-navy">
          {t("Marketer.referralBannerLanding")} <span className="font-mono font-bold">{referralCode}</span>
        </div>
      )}
      <div className="space-y-2">
        <Label>{t("Auth.iAm")}</Label>
        <div className="grid grid-cols-3 gap-2">
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
          <Link
            href="/marketer/apply"
            className="flex items-center justify-center rounded-lg border border-hajr-gray-200 px-3 py-2 text-center text-sm font-medium text-hajr-gray-500 transition-colors hover:border-hajr-rose hover:bg-hajr-rose/10 hover:text-hajr-navy"
          >
            {t("Auth.successPartner")}
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            {t("Auth.firstName")} <span className="text-destructive">*</span>
          </Label>
          <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{t("Validation.required")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="middleName">
            {t("Auth.middleName")} <span className="text-destructive">*</span>
          </Label>
          <Input id="middleName" autoComplete="additional-name" {...register("middleName")} />
          {errors.middleName && (
            <p className="text-xs text-destructive">{t("Validation.required")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">
            {t("Auth.lastName")} <span className="text-destructive">*</span>
          </Label>
          <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-destructive">{t("Validation.required")}</p>
          )}
        </div>
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
        <Label htmlFor="phone">
          {t("Common.phone")} <span className="text-destructive">*</span>
        </Label>
        <Input id="phone" type="tel" inputMode="tel" placeholder="05XXXXXXXX" dir="ltr" {...register("phone")} />
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
