"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";

/** Redeems a 6-char parent invite code, linking a child to the parent. */
export function LinkChildClient() {
  const t = useTranslations("ParentPortal");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) {
      toast.error(isAr ? "أدخل رمز الدعوة المكوّن من 6 خانات" : "Enter the 6-character code");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/parent/link-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(isAr ? "تم ربط الطالب بنجاح" : "Child linked successfully");
        router.push(`/${locale}/parent`);
        router.refresh();
      } else {
        toast.error(isAr ? json.errorAr ?? json.error : json.error);
      }
    } catch {
      toast.error(isAr ? "تعذّر ربط الطالب" : "Could not link child");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">{t("linkChildHint")}</p>
        <div className="space-y-1.5">
          <Label>{t("inviteCode")}</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            dir="ltr"
            className="text-center text-2xl font-mono tracking-[0.4em]"
          />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="me-2 h-4 w-4" />
          )}
          {t("linkChild")}
        </Button>
      </CardContent>
    </Card>
  );
}
