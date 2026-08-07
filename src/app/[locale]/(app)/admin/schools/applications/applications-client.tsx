"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X } from "lucide-react";

export interface PartnerApp {
  id: string;
  orgNameAr: string;
  orgNameEn: string | null;
  partnerType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  crNumber: string | null;
  expectedStudents: number | null;
  about: string;
  status: string;
  promoCode: string | null;
  setupUrl: string | null;
  createdAt: string;
}

/** wa.me deep link carrying the activation link to the partner contact. */
function waLink(phone: string, name: string, url: string, isAr: boolean): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("966")
    ? digits
    : digits.startsWith("0")
      ? `966${digits.slice(1)}`
      : digits;
  const msg = isAr
    ? `أهلاً ${name}، تمت الموافقة على شراكتكم مع أكاديمية هجر. فعّل حسابك من هنا: ${url}`
    : `Hello ${name}, your HAJR Academy partnership is approved. Activate your account here: ${url}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  CHARITY: { ar: "جمعية خيرية", en: "Charity" },
  SCHOOL: { ar: "مدرسة", en: "School" },
  INDIVIDUAL: { ar: "فرد / راعٍ", en: "Individual" },
};

export function PartnerApplicationsClient({
  applications,
}: {
  applications: PartnerApp[];
}) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{
    promoCode?: string | null;
    setupUrl?: string;
    whatsappUrl?: string;
    emailed?: boolean;
  } | null>(null);
  const [err, setErr] = useState("");

  async function review(id: string, action: "approve" | "reject") {
    const question =
      action === "reject"
        ? isAr
          ? "رفض هذا الطلب؟"
          : "Reject this application?"
        : isAr
          ? "الموافقة تُنشئ الشريك ورمز الخصم وحساب المسؤول ولا يمكن التراجع عنها. متابعة؟"
          : "Approving creates the partner, the discount code and a login, and cannot be undone. Continue?";
    if (!window.confirm(question)) return;
    setBusy(id);
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/partner-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "failed");
      if (action === "approve") {
        setResult({
          promoCode: j.promoCode,
          setupUrl: j.setupUrl,
          whatsappUrl: j.whatsappUrl,
          emailed: j.emailed,
        });
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isAr ? "طلبات شركاء النجاح" : "Success partner applications"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? "الموافقة تُنشئ الشريك ورمز الخصم وحساب المسؤول ورابط التفعيل دفعة واحدة."
            : "Approving creates the partner, their discount code, the contact's login and its activation link in one step."}
        </p>
      </div>

      {err && (
        <div className="rounded-lg border border-hajr-error/30 bg-hajr-error/10 p-3 text-sm">
          {err}
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold">
              {isAr ? "تمت الموافقة ✅" : "Approved ✅"}
            </p>
            {result.promoCode && (
              <p className="text-sm">
                {isAr ? "رمز الخصم: " : "Discount code: "}
                <span className="num font-bold" dir="ltr">
                  {result.promoCode}
                </span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {result.emailed
                ? isAr
                  ? "أُرسل رابط التفعيل بالبريد."
                  : "The activation link was emailed."
                : isAr
                  ? "لم يُرسل البريد — سلّم الرابط بنفسك:"
                  : "Email did not send — hand the link over yourself:"}
            </p>
            {result.setupUrl && (
              <div className="flex flex-wrap gap-2">
                {result.whatsappUrl && (
                  <Button asChild size="sm" variant="cta">
                    <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer">
                      {isAr ? "إرسال واتساب" : "Send on WhatsApp"}
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard?.writeText(result.setupUrl!)}
                >
                  {isAr ? "نسخ الرابط" : "Copy link"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">
          {isAr ? `قيد المراجعة (${pending.length})` : `Pending (${pending.length})`}
        </h2>
        {pending.length === 0 && (
          <p className="rounded-xl border border-hajr-border bg-white p-6 text-center text-sm text-muted-foreground">
            {isAr ? "لا توجد طلبات جديدة." : "No new applications."}
          </p>
        )}
        {pending.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{a.orgNameAr}</div>
                  <div className="text-xs text-muted-foreground">
                    {TYPE_LABEL[a.partnerType]?.[isAr ? "ar" : "en"] ?? a.partnerType}
                    {" · "}
                    {a.city}
                    {a.expectedStudents ? ` · ${a.expectedStudents} ${isAr ? "طالب متوقع" : "students"}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => review(a.id, "approve")} disabled={busy === a.id}>
                    {busy === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="me-1 h-4 w-4" />
                    )}
                    {isAr ? "موافقة" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => review(a.id, "reject")}
                    disabled={busy === a.id}
                  >
                    <X className="me-1 h-4 w-4" />
                    {isAr ? "رفض" : "Reject"}
                  </Button>
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">{a.contactName}</span>
                {" · "}
                <span dir="ltr">{a.contactPhone}</span>
                {" · "}
                <span dir="ltr">{a.contactEmail}</span>
              </div>
              <p className="rounded-lg bg-muted/40 p-3 text-sm">{a.about}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">{isAr ? "تمت مراجعتها" : "Reviewed"}</h2>
          <Card>
            <CardContent className="divide-y divide-hajr-border p-0">
              {reviewed.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex-1 font-medium">{a.orgNameAr}</span>
                  {a.promoCode && (
                    <span className="num text-xs text-hajr-rose" dir="ltr">
                      {a.promoCode}
                    </span>
                  )}
                  {/* The activation link survives a page reload, so the admin
                      can still hand it over days later. */}
                  {a.setupUrl && (
                    <div className="flex gap-1.5">
                      <Button asChild size="sm" variant="cta">
                        <a
                          href={waLink(a.contactPhone, a.contactName, a.setupUrl, isAr)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {isAr ? "واتساب" : "WhatsApp"}
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard?.writeText(a.setupUrl!)}
                      >
                        {isAr ? "نسخ" : "Copy"}
                      </Button>
                    </div>
                  )}
                  <Badge variant={a.status === "APPROVED" ? "success" : "outline"}>
                    {a.status === "APPROVED"
                      ? isAr
                        ? "معتمد"
                        : "Approved"
                      : isAr
                        ? "مرفوض"
                        : "Rejected"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
