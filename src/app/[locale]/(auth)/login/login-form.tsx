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
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME } from "@/lib/role-home";
import type { Role } from "@prisma/client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (res?.error) {
        setError(t("Auth.invalidCredentials"));
        toast.error(t("Auth.invalidCredentials"));
        return;
      }
      // hit /me to find role and redirect
      const me = await fetch("/api/me").then((r) => r.json()).catch(() => null);
      const role = (me?.role ?? "STUDENT") as Role;
      const home = ROLE_HOME[role] ?? "/student";
      router.replace(home);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("Common.email")}</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{t("Validation.emailInvalid")}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("Common.password")}</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          showLabel={t("Common.showPassword")}
          hideLabel={t("Common.hidePassword")}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{t("Validation.passwordMin")}</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="cta" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("Auth.loginNow")}
      </Button>
    </form>
  );
}
