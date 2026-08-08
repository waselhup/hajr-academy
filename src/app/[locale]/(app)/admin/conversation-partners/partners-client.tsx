"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Check, X, Globe, Clock, Mic, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CpApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  nativeLanguage: string;
  otherLanguages: string | null;
  timezone: string;
  availability: string;
  about: string;
  linkedin: string | null;
  status: string;
  setupUrl: string | null;
  createdAt: string;
}

export interface ActivePartner {
  id: string;
  name: string;
  email: string;
  country: string;
  nativeLanguage: string;
  timezone: string;
  availability: string | null;
  isActive: boolean;
  sessions: number;
}

export function ConversationPartnersClient({
  applications,
  partners,
}: {
  applications: CpApplication[];
  partners: ActivePartner[];
}) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{
    loginEmail?: string;
    setupUrl?: string;
    emailed?: boolean;
    warning?: string;
  } | null>(null);
  const [err, setErr] = useState("");

  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");

  async function review(id: string, action: "approve" | "reject") {
    const q =
      action === "reject"
        ? isAr ? "رفض هذا الطلب؟" : "Reject this application?"
        : isAr
          ? "الموافقة تُنشئ حساباً للشريك وترسل له بيانات الدخول. متابعة؟"
          : "Approving creates their account and emails their access details. Continue?";
    if (!window.confirm(q)) return;
    setBusy(id);
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/conversation-partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "failed");
      if (action === "approve") {
        setResult({
          loginEmail: j.loginEmail,
          setupUrl: j.setupUrl,
          emailed: j.emailed,
          warning: j.warning,
        });
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isAr ? "شركاء المحادثة" : "Conversation partners"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {isAr
            ? "متحدثون يتطوّعون للتحدث مع الطلاب. الموافقة تُنشئ حسابهم وترسل لهم بيانات الدخول؛ بعدها تنشئ جلسة في نادي المحادثة وتعيّن الشريك عليها."
            : "Speakers who volunteer to talk with students. Approving creates their account and emails their access; then you create a Speaking Club session and assign the partner to it."}
        </p>
      </div>

      {err && (
        <div className="rounded-lg border border-hajr-error/30 bg-hajr-error/10 p-3 text-sm">{err}</div>
      )}

      {result && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold">{isAr ? "تمت الموافقة ✅" : "Approved ✅"}</p>
            {result.warning ? (
              <p className="rounded-card bg-amber-50 p-3 text-sm text-amber-900">{result.warning}</p>
            ) : (
              <>
                <p className="text-sm">
                  {isAr ? "اسم الدخول: " : "Username: "}
                  <span className="font-bold" dir="ltr">{result.loginEmail}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.emailed
                    ? isAr
                      ? "أُرسلت بيانات الدخول بالبريد — يختار كلمة مروره بنفسه من الرابط."
                      : "Their access email was sent — they choose their own password from the link."
                    : isAr
                      ? "لم يُرسل البريد — سلّم الرابط بنفسك:"
                      : "The email did not send — hand the link over yourself:"}
                </p>
                {result.setupUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard?.writeText(result.setupUrl!);
                      toast.success(isAr ? "نُسخ الرابط" : "Link copied");
                    }}
                  >
                    <Copy className="me-2 h-4 w-4" />
                    {isAr ? "نسخ رابط التفعيل" : "Copy activation link"}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Pending applications ─────────────────────────────────────── */}
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
                  <div className="font-semibold">{a.fullName}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />{a.country}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mic className="h-3.5 w-3.5" />{a.nativeLanguage}
                      {a.otherLanguages ? ` · ${a.otherLanguages}` : ""}
                    </span>
                    <span className="inline-flex items-center gap-1 num" dir="ltr">
                      <Clock className="h-3.5 w-3.5" />{a.timezone}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => review(a.id, "approve")} disabled={busy === a.id}>
                    {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="me-1 h-4 w-4" />}
                    {isAr ? "موافقة" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => review(a.id, "reject")} disabled={busy === a.id}>
                    <X className="me-1 h-4 w-4" />
                    {isAr ? "رفض" : "Reject"}
                  </Button>
                </div>
              </div>

              <div className="text-sm" dir="ltr">
                {a.email} · {a.phone}
                {a.linkedin && (
                  <>
                    {" · "}
                    <a href={a.linkedin} target="_blank" rel="noopener noreferrer" className="underline">
                      link <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </>
                )}
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                  {isAr ? "الأوقات المتاحة" : "Availability"}
                </div>
                <p className="whitespace-pre-line">{a.availability}</p>
              </div>
              <p className="whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm">{a.about}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ── Approved partners ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {isAr ? `الشركاء المعتمدون (${partners.length})` : `Approved partners (${partners.length})`}
              </CardTitle>
              <CardDescription>
                {isAr
                  ? "لتشغيل جلسة معهم: أنشئ جلسة في نادي المحادثة وعيّن الشريك عليها."
                  : "To run a session with them: create a Speaking Club session and assign the partner to it."}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/speaking-club">
                <Mic className="me-2 h-4 w-4" />
                {isAr ? "نادي المحادثة" : "Speaking Club"}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {partners.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {isAr ? "لا يوجد شركاء معتمدون بعد." : "No approved partners yet."}
            </p>
          ) : (
            <div className="divide-y divide-hajr-border">
              {partners.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-[180px] flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{p.email}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {p.country} · {p.nativeLanguage}
                  </span>
                  <span className="num text-xs text-muted-foreground" dir="ltr">{p.timezone}</span>
                  <span className="num text-xs">
                    {p.sessions} {isAr ? "جلسة" : "sessions"}
                  </span>
                  <Badge variant={p.isActive ? "success" : "outline"}>
                    {p.isActive ? (isAr ? "نشِط" : "Active") : isAr ? "موقوف" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">{isAr ? "طلبات تمت مراجعتها" : "Reviewed applications"}</h2>
          <Card>
            <CardContent className="divide-y divide-hajr-border p-0">
              {reviewed.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex-1 font-medium">{a.fullName}</span>
                  <span className="text-xs text-muted-foreground">{a.country}</span>
                  {a.setupUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard?.writeText(a.setupUrl!);
                        toast.success(isAr ? "نُسخ الرابط" : "Link copied");
                      }}
                    >
                      {isAr ? "نسخ رابط التفعيل" : "Copy activation link"}
                    </Button>
                  )}
                  <Badge variant={a.status === "APPROVED" ? "success" : "outline"}>
                    {a.status === "APPROVED"
                      ? isAr ? "معتمد" : "Approved"
                      : isAr ? "مرفوض" : "Rejected"}
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
