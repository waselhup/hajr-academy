"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Props {
  eventId: string;
  initialRsvp: boolean;
  isFull: boolean;
  locale: string;
}

export function RsvpButton({ eventId, initialRsvp, isFull, locale }: Props) {
  const router = useRouter();
  const [rsvp, setRsvp] = useState(initialRsvp);
  const [pending, startTransition] = useTransition();
  const isAr = locale === "ar";

  async function toggle() {
    const method = rsvp ? "DELETE" : "POST";
    try {
      const r = await fetch(`/api/speaking-club/${eventId}/rsvp`, { method });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok !== false) {
        setRsvp(!rsvp);
        startTransition(() => router.refresh());
      } else {
        alert(data.error || (isAr ? "تعذّر التسجيل" : "Failed to RSVP"));
      }
    } catch {
      alert(isAr ? "خطأ في الشبكة" : "Network error");
    }
  }

  if (isFull && !rsvp) {
    return (
      <Button disabled className="w-full min-h-[44px]" variant="outline">
        {isAr ? "مكتمل" : "Full"}
      </Button>
    );
  }

  return (
    <Button
      onClick={toggle}
      disabled={pending}
      className={
        rsvp
          ? "w-full min-h-[44px] bg-hajr-success text-white"
          : "w-full min-h-[44px] bg-hajr-rose text-white"
      }
    >
      {rsvp ? (
        <>
          <Check className="h-4 w-4 me-1" />
          {isAr ? "مسجَّل" : "Reserved"}
        </>
      ) : (
        <>{isAr ? "احجز" : "RSVP"}</>
      )}
    </Button>
  );
}
