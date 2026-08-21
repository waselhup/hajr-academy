"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Check, X, Globe, Clock, Mic, ExternalLink, Copy, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  levelLabel,
  windowsLabel,
  genderLabel,
  telegramLink,
} from "@/lib/conversation-partners/criteria";

export interface CpApplication {
  id: string;
  fullName: string;
  email: string;
  /** WhatsApp, with country code. */
  phone: string;
  /** Telegram handle or number — optional. */
  telegram: string | null;
  country: string;
  gender: string | null;
  age: number | null;
  englishLevel: string | null;
  availabilityWindows: string[];
  about: string;
  status: string;
  setupUrl: string | null;
  /** False on an approved application whose login was never created. */
  hasAccount: boolean;
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

  // The queue runs to dozens of applications, so the page opens on the only
  // tab with work in it and the others stay one click away.
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      PENDING: applications.filter((a) => a.status === "PENDING").length,
      APPROVED: applications.filter((a) => a.status === "APPROVED").length,
      REJECTED: applications.filter((a) => a.status === "REJECTED").length,
    }),
    [applications],
  );

  // Matching on name/email/phone/country: the four things an admin actually
  // has in hand when someone asks "did my application arrive?".
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (a.status !== tab) return false;
      if (!q) return true;
      return [a.fullName, a.email, a.phone, a.country]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [applications, tab, query]);

  const TABS = [
    { key: "PENDING" as const, ar: "قيد المراجعة", en: "Pending" },
    { key: "APPROVED" as const, ar: "معتمد", en: "Approved" },
    { key: "REJECTED" as const, ar: "مرفوض", en: "Rejected" },
  ];

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

      {/* ── Applications, filtered by status ─────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-hajr-primary bg-hajr-primary text-white"
                    : "border-hajr-border bg-white text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {isAr ? t.ar : t.en}
                <span
                  className={`num rounded-full px-1.5 text-xs ${
                    active ? "bg-white/20" : "bg-muted"
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}

          {/* Search earns its place here: the pending queue runs past forty. */}
          <div className="relative ms-auto min-w-[210px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? "ابحث بالاسم أو البريد أو الجوال…" : "Search name, email, phone…"}
              aria-label={isAr ? "بحث في الطلبات" : "Search applications"}
              className="h-9 w-full rounded-full border border-hajr-border bg-white ps-9 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-hajr-primary/40"
            />
          </div>
        </div>

        {visible.length === 0 && (
          <p className="rounded-xl border border-hajr-border bg-white p-6 text-center text-sm text-muted-foreground">
            {query.trim()
              ? isAr
                ? "لا نتائج مطابقة لبحثك."
                : "Nothing matches your search."
              : isAr
                ? "لا توجد طلبات في هذه الحالة."
                : "No applications in this state."}
          </p>
        )}
        {visible.map((a) => (
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
                      {genderLabel(a.gender, isAr)}
                      {a.age != null && (
                        <span className="num">
                          {" · "}{a.age} {isAr ? "سنة" : "yrs"}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mic className="h-3.5 w-3.5" />
                      {a.englishLevel ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* A reviewed application keeps only the action that can still
                      change something — re-approving an approved row is a no-op
                      that would re-send their access email. */}
                  {a.status === "APPROVED" && (
                    <Badge
                      variant={a.hasAccount ? "success" : "outline"}
                      className={a.hasAccount ? undefined : "border-hajr-error/40 text-hajr-error"}
                    >
                      {a.hasAccount
                        ? isAr ? "معتمد" : "Approved"
                        : isAr ? "معتمد — بلا حساب" : "Approved — no account"}
                    </Badge>
                  )}
                  {a.status === "REJECTED" && (
                    <Badge variant="outline">{isAr ? "مرفوض" : "Rejected"}</Badge>
                  )}
                  {a.status !== "APPROVED" && (
                    <Button size="sm" onClick={() => review(a.id, "approve")} disabled={busy === a.id}>
                      {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="me-1 h-4 w-4" />}
                      {isAr ? "موافقة" : "Approve"}
                    </Button>
                  )}
                  {a.status !== "REJECTED" && (
                    <Button size="sm" variant="outline" onClick={() => review(a.id, "reject")} disabled={busy === a.id}>
                      <X className="me-1 h-4 w-4" />
                      {isAr ? "رفض" : "Reject"}
                    </Button>
                  )}
                  {a.setupUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard?.writeText(a.setupUrl!);
                        toast.success(isAr ? "نُسخ الرابط" : "Link copied");
                      }}
                    >
                      <Copy className="me-1 h-4 w-4" />
                      {isAr ? "رابط التفعيل" : "Activation link"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" dir="ltr">
                <span>{a.email}</span>
                {/* WhatsApp is mandatory, so it is always one tap away. */}
                <a
                  href={`https://wa.me/${a.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {a.phone} <ExternalLink className="inline h-3 w-3" />
                </a>
                {a.telegram &&
                  // Only a @username resolves on t.me; a bare number does not,
                  // so that case renders as plain text rather than a dead link.
                  (telegramLink(a.telegram) ? (
                    <a
                      href={telegramLink(a.telegram)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      @{a.telegram} <ExternalLink className="inline h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">
                      Telegram: {a.telegram}
                    </span>
                  ))}
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                  {isAr ? "الأوقات المتاحة (بتوقيت جرينتش)" : "Availability (GMT)"}
                </div>
                <p className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {windowsLabel(a.availabilityWindows, isAr)}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {levelLabel(a.englishLevel, isAr)}
                </div>
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

    </div>
  );
}
