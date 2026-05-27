"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  available: number;
  locale: string;
}

export function NewRequestForm({ available, locale }: Props) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    amount: "",
    periodStart: "",
    periodEnd: "",
    description: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || !form.periodStart || !form.periodEnd) {
      alert(isAr ? "املأ كل الحقول" : "Fill all fields");
      return;
    }
    if (amt > available) {
      alert(
        isAr
          ? `المبلغ المطلوب يتجاوز المتاح (${available.toFixed(2)} ر.س)`
          : `Amount exceeds available (${available.toFixed(2)} SAR)`
      );
      return;
    }
    startTransition(async () => {
      const r = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          description: form.description || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setForm({ amount: "", periodStart: "", periodEnd: "", description: "" });
        router.refresh();
      } else {
        alert(d.error || (isAr ? "فشل الإرسال" : "Submit failed"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Label>{isAr ? "المبلغ (ر.س) *" : "Amount (SAR) *"}</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          max={available}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {isAr ? "المتاح:" : "Available:"} {available.toFixed(2)} {isAr ? "ر.س" : "SAR"}
        </p>
      </div>
      <div>
        <Label>{isAr ? "من تاريخ *" : "Period start *"}</Label>
        <Input
          type="date"
          value={form.periodStart}
          onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>{isAr ? "إلى تاريخ *" : "Period end *"}</Label>
        <Input
          type="date"
          value={form.periodEnd}
          onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <Label>{isAr ? "ملاحظات" : "Description"}</Label>
        <Textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          disabled={pending || available <= 0}
          className="bg-hajr-rose text-white min-h-[44px] w-full"
        >
          {pending ? "..." : isAr ? "إرسال الطلب" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
