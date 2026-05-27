"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Rsvp {
  studentId: string;
  name: string;
  email: string;
  attended: boolean;
}

interface Props {
  eventId: string;
  rsvps: Rsvp[];
  locale: string;
}

export function AttendanceForm({ eventId, rsvps, locale }: Props) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(rsvps.map((r) => [r.studentId, r.attended]))
  );
  const [pending, startTransition] = useTransition();

  async function save() {
    startTransition(async () => {
      const r = await fetch(`/api/admin/speaking-club/${eventId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attendance: state }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        router.refresh();
      } else {
        alert(d.error || (isAr ? "تعذّر الحفظ" : "Save failed"));
      }
    });
  }

  if (rsvps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {isAr ? "لا توجد حجوزات" : "No RSVPs yet"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rsvps.map((r) => (
        <label
          key={r.studentId}
          className="flex items-center justify-between p-2 border border-hajr-border rounded-md min-h-[44px] cursor-pointer hover:bg-hajr-ivory"
        >
          <div>
            <div className="font-medium text-sm">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.email}</div>
          </div>
          <Checkbox
            checked={state[r.studentId] ?? false}
            onCheckedChange={(v) =>
              setState({ ...state, [r.studentId]: !!v })
            }
          />
        </label>
      ))}
      <Button
        onClick={save}
        disabled={pending}
        className="bg-hajr-rose text-white min-h-[44px] w-full"
      >
        {pending ? "..." : isAr ? "حفظ الحضور" : "Save attendance"}
      </Button>
    </div>
  );
}
