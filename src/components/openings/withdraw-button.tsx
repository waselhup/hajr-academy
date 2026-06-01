"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { withdrawApplicationAction } from "@/app/[locale]/(app)/teacher/_actions/openings";

/**
 * Thin client island around the teacher-side withdrawApplicationAction server
 * action: shows a pending spinner + success/error toast. The action itself
 * revalidates /teacher/openings so the surrounding server component re-renders.
 */
export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  function onWithdraw() {
    startTransition(async () => {
      try {
        const res = await withdrawApplicationAction(applicationId);
        if (res.ok) {
          toast.success(t("Openings.withdrawSuccess"));
        } else {
          toast.error(t("Openings.withdrawError"));
        }
      } catch {
        toast.error(t("Openings.withdrawError"));
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={onWithdraw}
    >
      {pending ? (
        <Loader2 className="me-2 h-4 w-4 animate-spin" />
      ) : (
        <X className="me-2 h-4 w-4" />
      )}
      {t("Openings.withdraw")}
    </Button>
  );
}
