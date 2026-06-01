"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyToProgramAction } from "@/app/[locale]/(applicant)/applicant/_actions";

/** Express-interest button on an applicant's openings card. */
export function ApplyInterestButton({ programId }: { programId: string }) {
  const t = useTranslations("Applicant");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await applyToProgramAction(programId);
      if (res.ok) {
        toast.success(t("interestSent"));
        router.refresh();
      } else {
        toast.error(t("interestError"));
      }
    });
  };

  return (
    <Button variant="cta" size="sm" className="w-full" onClick={onClick} disabled={isPending}>
      {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
      {t("expressInterest")}
    </Button>
  );
}
