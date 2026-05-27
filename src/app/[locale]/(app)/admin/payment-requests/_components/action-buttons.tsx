"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Banknote } from "lucide-react";

interface Props {
  reqId: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  locale: string;
}

export function ActionButtons({ reqId, status, locale }: Props) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [pending, startTransition] = useTransition();
  const [showPay, setShowPay] = useState(false);
  const [paidMethod, setPaidMethod] = useState("bank-transfer");
  const [paidReference, setPaidReference] = useState("");

  function call(action: "approve" | "markPaid" | "reject", body: Record<string, unknown> = {}) {
    startTransition(async () => {
      const r = await fetch(`/api/admin/payment-requests/${reqId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) router.refresh();
      else alert(d.error || (isAr ? "فشلت العملية" : "Action failed"));
    });
  }

  function reject() {
    const reason = window.prompt(isAr ? "سبب الرفض:" : "Rejection reason:");
    if (reason === null) return;
    call("reject", { reason });
  }

  function submitPay() {
    if (!paidMethod) {
      alert(isAr ? "أدخل طريقة الدفع" : "Enter payment method");
      return;
    }
    call("markPaid", { paidMethod, paidReference });
    setShowPay(false);
  }

  if (status === "PENDING") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => call("approve")}
          disabled={pending}
          size="sm"
          className="bg-hajr-success text-white min-h-[44px]"
        >
          <Check className="h-4 w-4 me-1" />
          {isAr ? "موافقة" : "Approve"}
        </Button>
        <Button
          onClick={reject}
          disabled={pending}
          variant="outline"
          size="sm"
          className="min-h-[44px] text-hajr-error"
        >
          <X className="h-4 w-4 me-1" />
          {isAr ? "رفض" : "Reject"}
        </Button>
      </div>
    );
  }

  if (status === "APPROVED") {
    if (!showPay) {
      return (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowPay(true)}
            size="sm"
            className="bg-hajr-rose text-white min-h-[44px]"
          >
            <Banknote className="h-4 w-4 me-1" />
            {isAr ? "تأكيد الدفع" : "Mark paid"}
          </Button>
          <Button
            onClick={reject}
            disabled={pending}
            variant="outline"
            size="sm"
            className="min-h-[44px] text-hajr-error"
          >
            <X className="h-4 w-4 me-1" />
            {isAr ? "رفض" : "Reject"}
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-2 bg-hajr-ivory p-3 rounded-md">
        <div className="grid sm:grid-cols-2 gap-2">
          <select
            className="border border-hajr-border rounded-md p-2 min-h-[44px] bg-white"
            value={paidMethod}
            onChange={(e) => setPaidMethod(e.target.value)}
          >
            <option value="bank-transfer">{isAr ? "تحويل بنكي" : "Bank transfer"}</option>
            <option value="cash">{isAr ? "نقداً" : "Cash"}</option>
            <option value="stc-pay">STC Pay</option>
            <option value="other">{isAr ? "أخرى" : "Other"}</option>
          </select>
          <input
            type="text"
            placeholder={isAr ? "مرجع المعاملة (اختياري)" : "Reference (optional)"}
            className="border border-hajr-border rounded-md p-2 min-h-[44px]"
            value={paidReference}
            onChange={(e) => setPaidReference(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={submitPay}
            disabled={pending}
            size="sm"
            className="bg-hajr-rose text-white min-h-[44px]"
          >
            {isAr ? "تأكيد" : "Confirm"}
          </Button>
          <Button
            onClick={() => setShowPay(false)}
            disabled={pending}
            size="sm"
            variant="outline"
            className="min-h-[44px]"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
