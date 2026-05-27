"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function RevokeButton({ certId, locale }: { certId: string; locale: string }) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [pending, startTransition] = useTransition();

  function revoke() {
    const reason = window.prompt(
      isAr ? "سبب السحب (اختياري):" : "Revocation reason (optional):"
    );
    if (reason === null) return; // cancelled
    startTransition(async () => {
      const r = await fetch(`/api/admin/certificates/${certId}/revoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) router.refresh();
      else alert(d.error || (isAr ? "فشل السحب" : "Revoke failed"));
    });
  }

  return (
    <Button
      onClick={revoke}
      disabled={pending}
      variant="outline"
      size="sm"
      className="min-h-[44px] text-hajr-error"
    >
      <Trash2 className="h-4 w-4 me-1" />
      {isAr ? "سحب" : "Revoke"}
    </Button>
  );
}
