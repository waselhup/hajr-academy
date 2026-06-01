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
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    appliedProgramId: z.string().optional(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type FormData = z.infer<typeof schema>;

export function ApplyToTeachForm({
  programs,
}: {
  programs: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    startTransition(async () => {
      const res = await fetch("/api/applicants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          nameAr: data.nameAr,
          phone: data.phone,
          gender: data.gender || undefined,
          appliedProgramId: data.appliedProgramId || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setServerError(j.error ?? "Failed");
        toast.error(j.error ?? t("Common.error"));
        return;
      }
      toast.success(t("ApplicantAuth.accountCreated"));
      const signin = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (signin?.error) {
        router.push("/login");
        return;
      }
      router.replace("/applicant");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <Input id="email" type="email" dir="ltr" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{t("Validation.emailInvalid")}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{t("Common.phone")}</Label>
        <Input id="phone" type="tel" placeholder="05XXXXXXXX" dir="ltr" {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{t("Validation.phoneInvalid")}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gender">{t("ApplicantAuth.gender")}</Label>
          <select
            id="gender"
            {...register("gender")}
            className="flex h-10 w-full rounded-md border border-hajr-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hajr-rose/40"
          >
            <option value="">{t("ApplicantAuth.genderUnspecified")}</option>
            <option value="MALE">{t("ApplicantAuth.genderMale")}</option>
            <option value="FEMALE">{t("ApplicantAuth.genderFemale")}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="appliedProgramId">{t("ApplicantAuth.programInterest")}</Label>
          <select
            id="appliedProgramId"
            {...register("appliedProgramId")}
            className="flex h-10 w-full rounded-md border border-hajr-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hajr-rose/40"
          >
            <option value="">{t("ApplicantAuth.programNone")}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

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

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" variant="cta" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("ApplicantAuth.submit")}
      </Button>
    </form>
  );
}
