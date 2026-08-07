"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, X } from "lucide-react";
import { provisionOrderAction, cancelOrderAction } from "../../_actions/orders";

type Order = {
  id: string;
  studentName: string;
  phone: string;
  email: string | null;
  packageType: string;
  productSlug?: string | null;
  setupUrl?: string | null;
  promoCode?: string | null;
  discountSar?: string | null;
  notes: string | null;
  amountSar: string;
  paymentStatus: string;
  status: string;
  provisionedStudentId: string | null;
  createdAt: string;
};
type ClassOpt = { id: string; label: string; gender: string | null; full: boolean };
type SchoolOpt = { id: string; name: string };

const PACKAGE_NAMES: Record<string, { ar: string; en: string }> = {
  ESSENTIAL: { ar: "الأساسية", en: "Essential" },
  INTEGRATED: { ar: "المتكاملة", en: "Integrated" },
  PRIVATE: { ar: "الخاصة", en: "Private" },
  STEP_PREP_PKG: { ar: "ستيب", en: "STEP Prep" },
  IELTS_PREP_PKG: { ar: "آيلتس", en: "IELTS Prep" },
  SCHOOL: { ar: "المدارس", en: "School" },
};

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  STUDENT_CREATED: "bg-amber-100 text-amber-700",
  ENROLLED: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export function OrdersClient({
  locale,
  orders,
  classes,
  schools,
}: {
  locale: string;
  orders: Order[];
  classes: ClassOpt[];
  schools: SchoolOpt[];
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [active, setActive] = useState<Order | null>(null);

  const statusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      NEW: { ar: "جديد", en: "New" },
      STUDENT_CREATED: { ar: "أُنشئ الحساب", en: "Account created" },
      ENROLLED: { ar: "مُسجَّل في فصل", en: "Enrolled" },
      COMPLETED: { ar: "مكتمل", en: "Completed" },
      CANCELLED: { ar: "ملغى", en: "Cancelled" },
    };
    return map[s]?.[isAr ? "ar" : "en"] ?? s;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-navy">
          {isAr ? "طلبات الشراء" : "Purchase orders"}
        </h1>
        <p className="mt-1 text-sm text-hajr-muted">
          {isAr
            ? "عمليات الشراء من الصفحة الرئيسية. أنشئ حساب الطالب وعيّنه في فصل."
            : "Purchases from the landing page. Create the student account and assign a class."}
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-hajr-border bg-white p-8 text-center text-hajr-muted">
          {isAr ? "لا توجد طلبات بعد." : "No orders yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hajr-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-hajr-border bg-hajr-cream text-start">
              <tr>
                <Th>{isAr ? "اسم الطالب" : "Student"}</Th>
                <Th>{isAr ? "الجوال" : "Phone"}</Th>
                <Th>{isAr ? "الباقة" : "Package"}</Th>
                <Th>{isAr ? "المبلغ" : "Amount"}</Th>
                <Th>{isAr ? "الدفع" : "Payment"}</Th>
                <Th>{isAr ? "الحالة" : "Status"}</Th>
                <Th>{isAr ? "إجراء" : "Action"}</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const done = o.status === "ENROLLED" || o.status === "STUDENT_CREATED" || o.status === "COMPLETED";
                const cancelled = o.status === "CANCELLED";
                return (
                  <tr key={o.id} className="border-b border-hajr-border/50 last:border-0">
                    <td className="px-3 py-3 font-medium text-hajr-navy">{o.studentName}</td>
                    <td className="px-3 py-3" dir="ltr">{o.phone}</td>
                    <td className="px-3 py-3">
                      {/* The catalogue slug is what was actually bought; the
                          package type is only the provisioning bucket. */}
                      <div>{o.productSlug ?? (PACKAGE_NAMES[o.packageType]?.[isAr ? "ar" : "en"] ?? o.packageType)}</div>
                      {o.promoCode && (
                        <div className="num text-xs text-hajr-rose" dir="ltr">
                          {o.promoCode} −{o.discountSar ?? "0"}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 num">{o.amountSar} {isAr ? "ر.س" : "SAR"}</td>
                    <td className="px-3 py-3">
                      <Badge variant={o.paymentStatus === "PAID" ? "default" : "outline"}>
                        {o.paymentStatus === "PAID" ? (isAr ? "مدفوع" : "Paid") : o.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status] ?? ""}`}>
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {/* A paid order now provisions itself and stores the
                          buyer's activation link. The admin's remaining job
                          is to hand that link over if the email bounced. */}
                      <div className="space-y-1.5">
                        {o.setupUrl && <SetupLinkActions isAr={isAr} order={o} />}
                        {!cancelled && !o.provisionedStudentId && (
                          <Button size="sm" variant="cta" onClick={() => setActive(o)}>
                            <UserPlus className="me-1 h-3.5 w-3.5" />
                            {isAr ? "إنشاء طالب" : "Provision"}
                          </Button>
                        )}
                        {!o.setupUrl && (cancelled || o.provisionedStudentId) && (
                          <span className="text-xs text-hajr-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <ProvisionDialog
          isAr={isAr}
          order={active}
          classes={classes}
          schools={schools}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Hand the buyer their activation link. The welcome email is sent
 * automatically, but email is the one channel we cannot guarantee — so the
 * same link is always one click from WhatsApp.
 */
function SetupLinkActions({ isAr, order }: { isAr: boolean; order: Order }) {
  const [copied, setCopied] = useState(false);
  const url = order.setupUrl ?? "";

  const waHref = (() => {
    const digits = order.phone.replace(/\D/g, "");
    const intl = digits.startsWith("966")
      ? digits
      : digits.startsWith("0")
        ? `966${digits.slice(1)}`
        : digits;
    const msg = isAr
      ? `أهلاً ${order.studentName}، حياك الله في أكاديمية هجر. فعّل حسابك واختر كلمة مرورك من هنا: ${url}`
      : `Hello ${order.studentName}, welcome to HAJR Academy. Set your password here: ${url}`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  })();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="cta" asChild>
        <a href={waHref} target="_blank" rel="noopener noreferrer">
          {isAr ? "إرسال واتساب" : "Send on WhatsApp"}
        </a>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ الرابط" : "Copy link"}
      </Button>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-start font-semibold text-hajr-navy">{children}</th>;
}

function ProvisionDialog({
  isAr,
  order,
  classes,
  schools,
  onClose,
  onDone,
}: {
  isAr: boolean;
  order: Order;
  classes: ClassOpt[];
  schools: SchoolOpt[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(order.studentName);
  const [email, setEmail] = useState(order.email ?? "");
  const [phone] = useState(order.phone);
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [englishLevel, setEnglishLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSubmit = name.trim().length >= 2 && emailOk && !busy;

  async function submit(allowUnpaid = false) {
    if (!canSubmit) return;
    setBusy(true);
    setErr("");
    const res = await provisionOrderAction({
      orderId: order.id,
      name: name.trim(),
      email: email.trim(),
      phone,
      gender,
      englishLevel,
      schoolId: schoolId || undefined,
      classId: classId || undefined,
      allowUnpaid,
    });
    if (res.ok) {
      onDone();
    } else {
      setBusy(false);
      // The order never settled at the gateway. Provisioning it hands out
      // the service for free, so it takes a deliberate confirmation.
      if (res.error === "ORDER_NOT_PAID") {
        const proceed = window.confirm(
          isAr
            ? "لم يتم تأكيد الدفع لهذا الطلب. هل تريد إنشاء الحساب على أي حال؟ (استخدمها فقط إذا استلمت المبلغ بطريقة أخرى)"
            : "This order has no confirmed payment. Create the account anyway? (Only if you received the money another way.)"
        );
        if (proceed) {
          await submit(true);
          return;
        }
        setErr(
          isAr ? "لم يتم تأكيد الدفع لهذا الطلب." : "This order is not paid."
        );
        return;
      }
      const map: Record<string, string> = {
        EMAIL_EXISTS: isAr ? "هذا البريد مستخدم مسبقاً" : "Email already exists",
        INVALID_PHONE: isAr ? "رقم جوال غير صالح" : "Invalid phone",
        ALREADY_PROVISIONED: isAr ? "تم إنشاء الحساب مسبقاً" : "Already provisioned",
      };
      setErr(map[res.error] ?? res.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-hajr-navy">
            {isAr ? "إنشاء حساب الطالب" : "Provision student"}
          </h2>
          <button onClick={onClose} className="text-hajr-muted hover:text-hajr-navy">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>{isAr ? "اسم الطالب *" : "Student name *"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "البريد الإلكتروني *" : "Email *"}</Label>
            <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            {!order.email && (
              <p className="text-xs text-hajr-muted">
                {isAr ? "العميل لم يُدخل بريداً — أدخله لإنشاء الدخول." : "Customer left email blank — enter one to create the login."}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "الجوال" : "Phone"}</Label>
            <Input value={phone} dir="ltr" disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isAr ? "الجنس" : "Gender"}</Label>
              <select
                className="w-full rounded-md border border-hajr-border bg-white p-2 min-h-[40px]"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="MALE">{isAr ? "ذكر" : "Male"}</option>
                <option value="FEMALE">{isAr ? "أنثى" : "Female"}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{isAr ? "المستوى" : "Level"}</Label>
              <select
                className="w-full rounded-md border border-hajr-border bg-white p-2 min-h-[40px]"
                value={englishLevel}
                onChange={(e) => setEnglishLevel(e.target.value as any)}
              >
                <option value="BEGINNER">{isAr ? "مبتدئ" : "Beginner"}</option>
                <option value="INTERMEDIATE">{isAr ? "متوسط" : "Intermediate"}</option>
                <option value="ADVANCED">{isAr ? "متقدّم" : "Advanced"}</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "المدرسة (اختياري)" : "School (optional)"}</Label>
            <select
              className="w-full rounded-md border border-hajr-border bg-white p-2 min-h-[40px]"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">{isAr ? "بدون" : "None"}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{isAr ? "تعيين في فصل (اختياري)" : "Assign to class (optional)"}</Label>
            <select
              className="w-full rounded-md border border-hajr-border bg-white p-2 min-h-[40px]"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">{isAr ? "لاحقاً" : "Later"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} disabled={c.full}>
                  {c.label}{c.full ? (isAr ? " (ممتلئ)" : " (full)") : ""}
                </option>
              ))}
            </select>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="cta" className="flex-1" onClick={() => submit()} disabled={!canSubmit}>
              {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isAr ? "إنشاء الحساب" : "Create account"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </div>
          <p className="text-center text-xs text-hajr-muted">
            {isAr
              ? "سيصل الطالب رابط لاختيار كلمة مروره — لا توجد كلمة مرور افتراضية."
              : "The student receives a link to choose their own password — there is no default password."}
          </p>
        </div>
      </div>
    </div>
  );
}
