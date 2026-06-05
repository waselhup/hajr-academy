"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const PACKAGE_NAMES: Record<string, { ar: string; en: string }> = {
  ESSENTIAL: { ar: "الباقة الأساسية", en: "Essential" },
  INTEGRATED: { ar: "الباقة المتكاملة", en: "Integrated" },
  PRIVATE: { ar: "الباقة الخاصة", en: "Private" },
  STEP_PREP_PKG: { ar: "باقة التحضير لاختبار ستيب", en: "STEP Prep" },
  IELTS_PREP_PKG: { ar: "باقة التحضير لاختبار آيلتس", en: "IELTS Prep" },
};

export function CheckoutForm({
  locale,
  packageType,
  amountSar,
}: {
  locale: string;
  packageType: string;
  amountSar: number;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const pkgName = PACKAGE_NAMES[packageType]?.[isAr ? "ar" : "en"] ?? packageType;
  const phoneOk = /^(\+966|05)\d{8,}$/.test(phone.trim());
  const canSubmit = studentName.trim().length >= 2 && phoneOk && status !== "sending";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          packageType,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        router.push(`/${locale}/checkout/success?order=${data.orderId}`);
        return;
      }
      setStatus("error");
      setErrorMsg(isAr ? "تعذّر إتمام الطلب. حاول مرة أخرى." : "Could not complete the order. Please try again.");
    } catch {
      setStatus("error");
      setErrorMsg(isAr ? "خطأ في الشبكة." : "Network error.");
    }
  }

  return (
    <div className="rounded-2xl border border-hajr-border bg-white p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-bold text-hajr-navy">
        {isAr ? "إتمام الاشتراك" : "Complete your subscription"}
      </h1>
      <p className="mt-1 text-sm text-hajr-muted">
        {isAr
          ? "أدخل بيانات الطالب لإتمام الطلب. سيتواصل معك فريق هجر خلال 24 ساعة."
          : "Enter the student details to complete your order. The Hajr team will contact you within 24 hours."}
      </p>

      {/* Selected package summary */}
      <div className="mt-5 flex items-center justify-between rounded-xl bg-hajr-cream px-4 py-3">
        <span className="font-semibold text-hajr-navy">{pkgName}</span>
        <span className="num text-lg font-extrabold text-hajr-navy">
          {amountSar} {isAr ? "ر.س / شهرياً" : "SAR / mo"}
        </span>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="studentName">
            {isAr ? "اسم الطالب *" : "Student name *"}
          </Label>
          <Input
            id="studentName"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoComplete="name"
            placeholder={isAr ? "الاسم الكامل" : "Full name"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">
            {isAr ? "رقم الجوال *" : "Phone number *"}
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            dir="ltr"
            placeholder="05XXXXXXXX"
          />
          {phone.length > 0 && !phoneOk && (
            <p className="text-xs text-destructive">
              {isAr ? "يجب أن يبدأ بـ 05 أو +966" : "Must start with 05 or +966"}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            {isAr ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            dir="ltr"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">
            {isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={isAr ? "أي تفاصيل إضافية" : "Any extra details"}
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-destructive">{errorMsg}</p>
        )}

        <Button type="submit" variant="cta" className="w-full" disabled={!canSubmit}>
          {status === "sending" && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isAr ? `ادفع ${amountSar} ر.س` : `Pay ${amountSar} SAR`}
        </Button>

        <p className="text-center text-xs text-hajr-muted">
          {isAr
            ? "بالضغط على الدفع فإنك توافق على سياسة الاسترجاع والخصوصية."
            : "By paying you agree to the refund and privacy policies."}
        </p>
      </form>
    </div>
  );
}
