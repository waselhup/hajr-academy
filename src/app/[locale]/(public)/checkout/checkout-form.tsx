"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Tag } from "lucide-react";

export interface CheckoutProduct {
  slug: string;
  name: string;
  desc: string | null;
  price: number;
  unit: string;
  group: "CORE" | "COURSE" | "SUMMER";
}

const GROUP_LABEL: Record<string, { ar: string; en: string }> = {
  CORE: { ar: "التقوية الفصلية", en: "Term reinforcement" },
  COURSE: { ar: "الدورات التحضيرية", en: "Preparation courses" },
  SUMMER: { ar: "البرنامج الصيفي المكثّف", en: "Summer intensive" },
};

/**
 * Public purchase form.
 *
 * The prices rendered here are the catalogue's, and they are re-read on the
 * server when the order is created — the total shown is a preview, never
 * the authority. A promo code is likewise validated server-side; the reply
 * tells us what was actually applied.
 */
export function CheckoutForm({
  locale,
  products,
  initialSlug,
  initialPromo,
}: {
  locale: string;
  products: CheckoutProduct[];
  initialSlug: string;
  initialPromo?: string;
}) {
  const isAr = locale === "ar";
  const router = useRouter();

  const [slug, setSlug] = useState(initialSlug);
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [promo, setPromo] = useState(initialPromo ?? "");
  const [promoNote, setPromoNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const selected = products.find((p) => p.slug === slug) ?? products[0];

  const grouped = useMemo(() => {
    const out: { group: string; items: CheckoutProduct[] }[] = [];
    for (const p of products) {
      const g = out.find((x) => x.group === p.group);
      if (g) g.items.push(p);
      else out.push({ group: p.group, items: [p] });
    }
    return out;
  }, [products]);

  const phoneOk = /^(\+966|05)\d{8,}$/.test(phone.trim());
  const canSubmit =
    studentName.trim().length >= 2 && phoneOk && !!selected && status !== "sending";

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      maximumFractionDigits: 2,
    }).format(n);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setErrorMsg("");
    setPromoNote("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          product: selected.slug,
          promoCode: promo.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        router.push(
          data.settled
            ? `/${locale}/checkout/success?order=${data.orderId}`
            : `/${locale}/checkout/pay/${data.orderId}`
        );
        return;
      }
      setStatus("error");
      if (data.promoRejected) {
        setPromoNote(data.error ?? (isAr ? "رمز الخصم غير صالح." : "Invalid promo code."));
        setErrorMsg(
          isAr
            ? "رمز الخصم غير مقبول — احذفه أو صحّحه للمتابعة."
            : "The promo code was not accepted — remove or correct it to continue."
        );
        return;
      }
      setErrorMsg(
        data.error ??
          (isAr ? "تعذّر إتمام الطلب. حاول مرة أخرى." : "Could not complete the order. Please try again.")
      );
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
          ? "اختر الباقة وأدخل بيانات الطالب، ثم ادفع مباشرة عبر بوابة ميسر."
          : "Choose your package, enter the student details, then pay securely via Moyasar."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="product">{isAr ? "الباقة *" : "Package *"}</Label>
          <select
            id="product"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="h-10 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-navy focus:outline-none focus:ring-2 focus:ring-hajr-navy/20"
          >
            {grouped.map((g) => (
              <optgroup
                key={g.group}
                label={GROUP_LABEL[g.group]?.[isAr ? "ar" : "en"] ?? g.group}
              >
                {g.items.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} — {money(p.price)} {p.unit}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Selected package summary */}
        {selected && (
          <div className="rounded-xl bg-hajr-cream px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-hajr-navy">
                {selected.name}
              </span>
              <span className="num whitespace-nowrap text-lg font-extrabold text-hajr-navy">
                {money(selected.price)}{" "}
                <span className="text-xs font-medium">{selected.unit}</span>
              </span>
            </div>
            {selected.desc && (
              <p className="mt-1 text-xs text-hajr-muted">{selected.desc}</p>
            )}
          </div>
        )}

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
          <Label htmlFor="promo" className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {isAr ? "رمز الخصم (اختياري)" : "Promo code (optional)"}
          </Label>
          <Input
            id="promo"
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            dir="ltr"
            placeholder={isAr ? "أدخل الرمز إن وُجد" : "Enter your code"}
          />
          <p className="text-xs text-hajr-muted">
            {isAr
              ? "سيُطبَّق الخصم ويظهر المبلغ النهائي في صفحة الدفع."
              : "The discount is applied and the final amount is shown on the payment page."}
          </p>
          {promoNote && <p className="text-xs text-destructive">{promoNote}</p>}
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
          {isAr ? "المتابعة إلى الدفع" : "Continue to payment"}
        </Button>

        <p className="text-center text-xs text-hajr-muted">
          {isAr
            ? "بالضغط على المتابعة فإنك توافق على سياسة الاسترجاع والخصوصية."
            : "By continuing you agree to the refund and privacy policies."}
        </p>
      </form>
    </div>
  );
}
