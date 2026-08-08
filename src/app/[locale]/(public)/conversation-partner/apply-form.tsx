"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ConversationPartnerForm({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  const [f, setF] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    nativeLanguage: "English",
    otherLanguages: "",
    timezone: "",
    availability: "",
    about: "",
    linkedin: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "done">("idle");
  const [err, setErr] = useState("");

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim());
  // Any country: partners are recruited abroad by definition.
  const phoneOk = /^(\+|00)?[1-9][\d\s\-().]{6,}$/.test(f.phone.trim());
  const canSubmit =
    f.fullName.trim().length >= 2 &&
    emailOk &&
    phoneOk &&
    f.country.trim().length >= 2 &&
    f.nativeLanguage.trim().length >= 2 &&
    f.timezone.trim().length >= 2 &&
    f.availability.trim().length >= 5 &&
    f.about.trim().length >= 20 &&
    status !== "sending";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setErr("");
    try {
      const res = await fetch("/api/conversation-partners/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setStatus("done");
        return;
      }
      setStatus("error");
      setErr(
        data.error ??
          (isAr ? "تعذّر إرسال الطلب. حاول مرة أخرى." : "Could not send the application. Please try again.")
      );
    } catch {
      setStatus("error");
      setErr(isAr ? "خطأ في الشبكة." : "Network error.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-hajr-border bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-hajr-mint/50">
          <CheckCircle2 className="h-7 w-7 text-hajr-deep-navy" />
        </div>
        <h2 className="text-2xl font-bold text-hajr-navy">
          {isAr ? "وصلنا طلبك ✅" : "We have your application ✅"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-hajr-muted">
          {isAr
            ? "سيراجعه فريق الأكاديمية. عند الموافقة سيصلك بريد إلكتروني فيه بيانات الدخول إلى صفحتك الخاصة، حيث ترى جلساتك القادمة وروابط الدخول إليها."
            : "Our team will review it. Once approved you'll get an email with your access details for your own page, where you'll see your upcoming sessions and their joining links."}
        </p>
        <p className="mt-4 text-xs text-hajr-muted">
          {isAr
            ? "تأكد من مراجعة مجلد البريد المزعج إن لم تجد الرسالة."
            : "If you don't see the email, please check your spam folder."}
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
        <Field label={isAr ? "الاسم الكامل *" : "Full name *"}>
          <Input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        </Field>
        <Field label={isAr ? "الدولة *" : "Country *"}>
          <Input
            value={f.country}
            onChange={(e) => set("country", e.target.value)}
            required
            placeholder={isAr ? "مثال: المملكة المتحدة" : "e.g. United Kingdom"}
          />
        </Field>
        <Field
          label={isAr ? "البريد الإلكتروني *" : "Email *"}
          error={f.email.length > 0 && !emailOk ? (isAr ? "بريد غير صالح" : "Invalid email") : undefined}
        >
          <Input
            type="email"
            dir="ltr"
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </Field>
        <Field
          label={isAr ? "رقم الجوال *" : "Phone *"}
          hint={isAr ? "مع رمز الدولة" : "Include the country code"}
          error={f.phone.length > 0 && !phoneOk ? (isAr ? "رقم غير صالح" : "Invalid number") : undefined}
        >
          <Input
            dir="ltr"
            inputMode="tel"
            value={f.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
            placeholder="+44 7700 900000"
          />
        </Field>
        <Field label={isAr ? "اللغة الأم *" : "Native language *"}>
          <Input
            value={f.nativeLanguage}
            onChange={(e) => set("nativeLanguage", e.target.value)}
            required
          />
        </Field>
        <Field label={isAr ? "لغات أخرى (اختياري)" : "Other languages (optional)"}>
          <Input value={f.otherLanguages} onChange={(e) => set("otherLanguages", e.target.value)} />
        </Field>
      </div>

      <Field
        label={isAr ? "المنطقة الزمنية *" : "Time zone *"}
        hint={isAr ? "لنجدول الجلسات في وقت يناسبك" : "So we schedule sessions at a time that works for you"}
      >
        <Input
          dir="ltr"
          value={f.timezone}
          onChange={(e) => set("timezone", e.target.value)}
          required
          placeholder="GMT+1 / Europe/London"
        />
      </Field>

      <Field
        label={isAr ? "الأوقات المتاحة لديك *" : "When are you available? *"}
        hint={isAr ? "الأيام والساعات بتوقيتك أنت" : "Days and hours, in your own time zone"}
      >
        <Textarea
          rows={2}
          value={f.availability}
          onChange={(e) => set("availability", e.target.value)}
          required
          placeholder={
            isAr ? "مثال: الإثنين والأربعاء، 6–9 مساءً" : "e.g. Mondays and Wednesdays, 6–9 PM"
          }
        />
      </Field>

      <Field label={isAr ? "عرّفنا بنفسك *" : "Tell us about yourself *"}>
        <Textarea
          rows={4}
          value={f.about}
          onChange={(e) => set("about", e.target.value)}
          required
          placeholder={
            isAr
              ? "خلفيتك، ولماذا ترغب في التحدث مع طلابنا، وأي خبرة سابقة في التطوّع أو التدريس."
              : "Your background, why you'd like to talk with our students, and any volunteering or teaching experience."
          }
        />
      </Field>

      <Field label={isAr ? "لينكدإن أو موقعك (اختياري)" : "LinkedIn or website (optional)"}>
        <Input dir="ltr" value={f.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
      </Field>

      {status === "error" && <p className="text-sm text-destructive">{err}</p>}

      <Button type="submit" variant="cta" className="w-full" disabled={!canSubmit}>
        {status === "sending" && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {isAr ? "إرسال الطلب" : "Send application"}
      </Button>
      <p className="text-center text-xs text-hajr-muted">
        {isAr
          ? "لا يُنشأ لك حساب إلا بعد موافقة الأكاديمية على طلبك."
          : "No account is created for you until the academy approves your application."}
      </p>
    </form>
  );
}

function Field({
  label, hint, error, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-hajr-muted">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
