"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "CHARITY", ar: "جمعية خيرية", en: "Charity" },
  { value: "SCHOOL", ar: "مدرسة", en: "School" },
  { value: "INDIVIDUAL", ar: "فرد / راعٍ", en: "Individual sponsor" },
];

export function PartnerApplyForm({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  const [f, setF] = useState({
    orgNameAr: "",
    orgNameEn: "",
    partnerType: "CHARITY",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    city: "",
    crNumber: "",
    expectedStudents: "",
    about: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const phoneOk = /^(\+966|05)\d{8,}$/.test(f.contactPhone.trim());
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.contactEmail.trim());
  const canSubmit =
    f.orgNameAr.trim().length >= 2 &&
    f.contactName.trim().length >= 2 &&
    emailOk &&
    phoneOk &&
    f.city.trim().length >= 2 &&
    f.about.trim().length >= 20 &&
    status !== "sending";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setErr("");
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...f,
          orgNameEn: f.orgNameEn.trim() || undefined,
          crNumber: f.crNumber.trim() || undefined,
          expectedStudents: f.expectedStudents
            ? Number(f.expectedStudents.replace(/\D/g, "")) || undefined
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setStatus("done");
        return;
      }
      setStatus("error");
      setErr(data.error ?? (isAr ? "تعذّر إرسال الطلب." : "Could not send the application."));
    } catch {
      setStatus("error");
      setErr(isAr ? "خطأ في الشبكة." : "Network error.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-hajr-border bg-white p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-12 w-12 text-hajr-success" />
        <h2 className="mt-4 text-xl font-bold text-hajr-deep-navy">
          {isAr ? "وصلنا طلبك" : "We received your application"}
        </h2>
        <p className="mt-2 text-sm text-hajr-muted">
          {isAr
            ? "سيراجعه فريق هجر ويتواصل معك خلال أيام عمل قليلة. عند الموافقة سيصلك رابط لتفعيل حسابك ورمز الخصم الخاص بجهتك."
            : "The Hajr team will review it and contact you within a few working days. On approval you will receive a link to activate your account and your organisation's discount code."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-hajr-border bg-white p-6 shadow-card sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="orgNameAr">{isAr ? "اسم الجهة *" : "Organisation name *"}</Label>
          <Input
            id="orgNameAr"
            value={f.orgNameAr}
            onChange={(e) => set("orgNameAr", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="partnerType">{isAr ? "نوع الشراكة *" : "Partner type *"}</Label>
          <select
            id="partnerType"
            value={f.partnerType}
            onChange={(e) => set("partnerType", e.target.value)}
            className="h-10 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {isAr ? t.ar : t.en}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactName">{isAr ? "اسم المسؤول *" : "Contact name *"}</Label>
          <Input
            id="contactName"
            value={f.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">{isAr ? "المدينة *" : "City *"}</Label>
          <Input id="city" value={f.city} onChange={(e) => set("city", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">{isAr ? "البريد الإلكتروني *" : "Email *"}</Label>
          <Input
            id="contactEmail"
            type="email"
            dir="ltr"
            value={f.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
            required
          />
          {f.contactEmail.length > 0 && !emailOk && (
            <p className="text-xs text-destructive">
              {isAr ? "بريد غير صالح" : "Invalid email"}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPhone">{isAr ? "رقم الجوال *" : "Phone *"}</Label>
          <Input
            id="contactPhone"
            dir="ltr"
            inputMode="tel"
            placeholder="05XXXXXXXX"
            value={f.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
            required
          />
          {f.contactPhone.length > 0 && !phoneOk && (
            <p className="text-xs text-destructive">
              {isAr ? "يجب أن يبدأ بـ 05 أو +966" : "Must start with 05 or +966"}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crNumber">
            {isAr ? "السجل التجاري / الترخيص (اختياري)" : "CR / licence number (optional)"}
          </Label>
          <Input
            id="crNumber"
            dir="ltr"
            value={f.crNumber}
            onChange={(e) => set("crNumber", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expectedStudents">
            {isAr ? "عدد الطلاب المتوقع (اختياري)" : "Expected students (optional)"}
          </Label>
          <Input
            id="expectedStudents"
            dir="ltr"
            inputMode="numeric"
            value={f.expectedStudents}
            onChange={(e) => set("expectedStudents", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="about">
          {isAr ? "عرّفنا بجهتك وهدفك من الشراكة *" : "Tell us about your organisation and goal *"}
        </Label>
        <Textarea
          id="about"
          rows={4}
          value={f.about}
          onChange={(e) => set("about", e.target.value)}
          required
          placeholder={
            isAr
              ? "من تخدمون؟ وكيف تتوقعون أن تفيدكم الشراكة؟"
              : "Who do you serve, and what would the partnership achieve?"
          }
        />
      </div>

      {status === "error" && <p className="text-sm text-destructive">{err}</p>}

      <Button type="submit" variant="cta" className="w-full" disabled={!canSubmit}>
        {status === "sending" && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {isAr ? "إرسال طلب الشراكة" : "Send partnership application"}
      </Button>
    </form>
  );
}
