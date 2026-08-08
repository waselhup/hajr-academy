"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus, Pencil, Loader2, Video, Users, CheckCircle2, AlertTriangle,
  Wifi, Trash2, Server, HelpCircle, CalendarClock, Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  createZoomAccountAction,
  updateZoomAccountAction,
  toggleZoomAccountActiveAction,
  testZoomAccountAction,
  deleteZoomAccountAction,
} from "../../_actions/zoom-accounts";

type Row = {
  id: string;
  label: string;
  hostEmail: string;
  capacity: number;
  maxConcurrent: number;
  isActive: boolean;
  ownCreds: boolean;
  teacherCount: number;
  teachers: string[];
  lastCheckOk: boolean | null;
  lastCheckedAt: string | null;
};

type MainConnection = {
  hostEmail: string;
  configured: boolean;
  teacherCount: number;
  teachers: string[];
};

type ClashSide = { sessionId: string; title: string; teacherName: string; start: string; end: string };
type Clash = { hostEmail: string; accountLabel: string | null; a: ClashSide; b: ClashSide };

/** Western digits + dd/mm/yyyy, pinned to KSA time — the platform-wide rule. */
function fmt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

export function ZoomAccountsClient({
  rows,
  mainConnection,
  clashes,
}: {
  rows: Row[];
  mainConnection: MainConnection;
  clashes: Clash[];
}) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [guideOpen, setGuideOpen] = useState(rows.length === 0);

  // Total classes that can run AT THE SAME MOMENT across every host.
  const totalConcurrent =
    rows.filter((r) => r.isActive).reduce((n, r) => n + r.maxConcurrent, 0) +
    (mainConnection.configured && mainConnection.hostEmail ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? "حسابات Zoom" : "Zoom Accounts"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {isAr
              ? "كل مستخدم Zoom يستطيع بث حصة واحدة فقط في نفس اللحظة. لتشغيل حصص متزامنة أكثر، أضف مستخدم Zoom آخر هنا وعيّن له معلّمين."
              : "One Zoom user can broadcast only one class at a time. To run more classes simultaneously, add another Zoom user here and assign teachers to it."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGuideOpen((v) => !v)}>
            <HelpCircle className="me-2 h-4 w-4" />
            {isAr ? "كيف أضيف حساباً؟" : "How do I add one?"}
          </Button>
          <Button variant="cta" onClick={() => setCreating(true)}>
            <Plus className="me-2 h-4 w-4" />
            {isAr ? "إضافة حساب" : "Add account"}
          </Button>
        </div>
      </div>

      {/* Headline number: the only figure that actually matters day to day. */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
          <div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "حصص متزامنة ممكنة الآن" : "Classes that can run at the same time"}
            </div>
            <div className="num text-3xl font-bold text-hajr-navy">{totalConcurrent}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "مستضيفو Zoom" : "Zoom hosts"}
            </div>
            <div className="num text-3xl font-bold">
              {rows.filter((r) => r.isActive).length + (mainConnection.hostEmail ? 1 : 0)}
            </div>
          </div>
          <p className="flex-1 text-xs text-muted-foreground">
            {isAr
              ? "الرقم = مجموع «الحصص المتزامنة» لكل مستضيف نشط. عدد المعلّمين لا يرفعه — عدد المستضيفين هو الذي يرفعه."
              : "This is the sum of each active host's simultaneous-meeting limit. Adding teachers does not raise it; adding hosts does."}
          </p>
        </CardContent>
      </Card>

      {guideOpen && <SetupGuide isAr={isAr} />}

      {/* Upcoming collisions — the failure this page exists to prevent. */}
      {clashes.length > 0 && (
        <Card className="border-hajr-error/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-hajr-rose">
              <CalendarClock className="h-5 w-5" />
              {isAr
                ? `تعارض في الجدول (${clashes.length})`
                : `Schedule conflicts (${clashes.length})`}
            </CardTitle>
            <CardDescription>
              {isAr
                ? "حصص قادمة تتقاطع في الوقت على نفس مستضيف Zoom. إن بدأت الثانية، سينهي Zoom الأولى ويخرج طلابها. عيّن أحد المعلّمَين على حساب Zoom آخر أو غيّر الموعد."
                : "Upcoming classes overlap on the same Zoom host. Starting the second one makes Zoom end the first and drop its students. Move one teacher to another Zoom account, or reschedule."}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-hajr-border p-0">
            {clashes.map((c, i) => (
              <div key={i} className="space-y-1 px-5 py-3 text-sm">
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {c.accountLabel ?? (isAr ? "الاتصال الرئيسي" : "Main connection")} · {c.hostEmail}
                </div>
                <div className="num" dir="auto">
                  <span className="font-medium">{c.a.title}</span> — {c.a.teacherName}
                  <span className="text-muted-foreground"> · {fmt(c.a.start)}</span>
                </div>
                <div className="num" dir="auto">
                  <span className="font-medium">{c.b.title}</span> — {c.b.teacherName}
                  <span className="text-muted-foreground"> · {fmt(c.b.start)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* The env-based host is real and in use — show it, don't hide it. */}
        <Card className={mainConnection.configured ? "" : "border-amber-300"}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <span className="icon-chip">
                <Server className="h-5 w-5" />
              </span>
              <Badge variant={mainConnection.configured ? "success" : "warning"}>
                {mainConnection.configured
                  ? isAr ? "متصل" : "Connected"
                  : isAr ? "غير مهيّأ" : "Not configured"}
              </Badge>
            </div>
            <CardTitle className="mt-3">{isAr ? "الاتصال الرئيسي" : "Main connection"}</CardTitle>
            <CardDescription dir="ltr" className="truncate text-start">
              {mainConnection.hostEmail || (isAr ? "لم يُضبط بريد المضيف" : "No host email set")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "حساب Zoom الأصلي المضبوط على الخادم. كل معلّم غير معيَّن على حساب آخر يبثّ من هنا."
                : "The original Zoom connection set on the server. Every teacher not assigned elsewhere broadcasts from here."}
            </p>
            <TeacherList
              isAr={isAr}
              names={mainConnection.teachers}
              count={mainConnection.teacherCount}
            />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="h-3.5 w-3.5" />
              {isAr ? "حصة واحدة في نفس الوقت" : "1 class at a time"}
            </div>
          </CardContent>
        </Card>

        {rows.map((a) => {
          const over = a.teacherCount > a.capacity;
          return (
            <Card key={a.id} className={a.isActive ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <span className="icon-chip">
                    <Video className="h-5 w-5" />
                  </span>
                  <Switch
                    checked={a.isActive}
                    onCheckedChange={async () => {
                      const res = await toggleZoomAccountActiveAction(a.id);
                      if (res.ok) toast.success(isAr ? "تم التحديث" : "Updated");
                      else toast.error(res.error);
                      router.refresh();
                    }}
                  />
                </div>
                <CardTitle className="mt-3">{a.label}</CardTitle>
                <CardDescription dir="ltr" className="truncate text-start">{a.hostEmail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className={over ? "num font-semibold text-hajr-rose" : "num font-semibold"}>
                      {a.teacherCount} / {a.capacity}
                    </span>
                    <span className="text-xs text-muted-foreground">{isAr ? "معلّم" : "teachers"}</span>
                  </span>
                  <Badge variant={a.ownCreds ? "info" : "default"}>
                    {a.ownCreds ? (isAr ? "مفاتيح خاصة" : "Own keys") : (isAr ? "الاتصال الرئيسي" : "Main connection")}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Radio className="h-3.5 w-3.5" />
                  <span className="num">{a.maxConcurrent}</span>
                  {isAr ? " حصة في نفس الوقت" : a.maxConcurrent === 1 ? " class at a time" : " classes at a time"}
                </div>

                <TeacherList isAr={isAr} names={a.teachers} count={a.teacherCount} />

                <div className="text-xs text-muted-foreground">
                  {a.lastCheckedAt == null ? (
                    <span>{isAr ? "لم يتم الاختبار بعد" : "Not tested yet"}</span>
                  ) : a.lastCheckOk ? (
                    <span className="inline-flex items-center gap-1 text-hajr-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {isAr ? "الاتصال سليم" : "Connection OK"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-hajr-rose">
                      <AlertTriangle className="h-3.5 w-3.5" /> {isAr ? "فشل الاختبار" : "Test failed"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <TestButton id={a.id} isAr={isAr} onDone={() => router.refresh()} />
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(a)}>
                    <Pencil className="me-2 h-4 w-4" />
                    {isAr ? "تعديل" : "Edit"}
                  </Button>
                  <DeleteButton
                    id={a.id}
                    label={a.label}
                    disabled={a.teacherCount > 0}
                    isAr={isAr}
                    onDone={() => router.refresh()}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {creating && <FormDialog isAr={isAr} onClose={() => setCreating(false)} onDone={() => router.refresh()} />}
      {editing && (
        <FormDialog isAr={isAr} row={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />
      )}
    </div>
  );
}

function TeacherList({ isAr, names, count }: { isAr: boolean; names: string[]; count: number }) {
  if (count === 0) {
    return (
      <p className="rounded-card bg-muted/40 p-2 text-xs text-muted-foreground">
        {isAr ? "لا يوجد معلّمون على هذا المستضيف." : "No teachers on this host."}
      </p>
    );
  }
  const shown = names.slice(0, 6);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((n, i) => (
        <Badge key={i} variant="outline" className="font-normal">{n}</Badge>
      ))}
      {count > shown.length && (
        <Badge variant="outline" className="num font-normal">+{count - shown.length}</Badge>
      )}
    </div>
  );
}

function SetupGuide({ isAr }: { isAr: boolean }) {
  return (
    <Card className="border-hajr-mint">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isAr ? "إضافة طاقة بث جديدة — خطوة بخطوة" : "Adding broadcast capacity — step by step"}
        </CardTitle>
        <CardDescription>
          {isAr
            ? "كل مستخدم Zoom مرخّص تضيفه = حصة إضافية يمكن بثّها في نفس الوقت."
            : "Each licensed Zoom user you add = one more class that can run at the same time."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <section className="space-y-2">
          <h3 className="font-semibold text-hajr-navy">
            {isAr
              ? "مستخدم جديد داخل حساب Zoom الحالي"
              : "A new user inside your existing Zoom account"}
          </h3>
          <ol className="list-decimal space-y-1.5 pe-5 ps-5 text-muted-foreground">
            <li>
              {isAr
                ? "في Zoom: Admin ← User Management ← Users ← Add Users، وأدخل بريداً جديداً (مثلاً teacher2@…)."
                : "In Zoom: Admin → User Management → Users → Add Users, and enter a new email (e.g. teacher2@…)."}
            </li>
            <li>
              {isAr
                ? "اجعل نوعه Licensed (مرخّص) — المستخدم Basic لا يصلح للحصص الطويلة."
                : "Set the user type to Licensed — a Basic user can't run long classes."}
            </li>
            <li>
              {isAr
                ? "افتح بريد الدعوة واقبلها لتفعيل المستخدم."
                : "Open the invitation email and accept it to activate the user."}
            </li>
            <li>
              {isAr
                ? "ارجع هنا ← إضافة حساب ← اكتب الاسم وبريد المستخدم الجديد، واترك خانات المفاتيح فارغة."
                : "Come back here → Add account → enter a label and the new user's email, leaving the key fields blank."}
            </li>
            <li>
              {isAr
                ? "اضغط اختبار للتأكد، ثم عيّن المعلّمين عليه من صفحة المعلّمين."
                : "Hit Test to confirm, then assign teachers to it from the Teachers page."}
            </li>
          </ol>
          <p className="rounded-card bg-hajr-mint/20 p-2.5 text-xs">
            {isAr
              ? "لا تحتاج أي مفاتيح أو أكواد جديدة من Zoom في هذه الطريقة — المفاتيح المضبوطة على المنصة تغطي كل مستخدمي حسابك تلقائياً. المطلوب منك فقط شراء رخصة (License) إضافية في Zoom."
              : "This route needs no new keys or codes from Zoom — the keys already on the platform cover every user in your account. All you buy is one extra Zoom license."}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold text-hajr-navy">
            {isAr ? "حساب Zoom منفصل تماماً؟" : "A completely separate Zoom account?"}
          </h3>
          <p className="rounded-card bg-amber-50 p-2.5 text-amber-900">
            {isAr
              ? "إذا كان الحساب مملوكاً لجهة أخرى ولا يمكن ضمّه لحسابك، فهو يحتاج ربطاً تقنياً — تواصل مع المطوّر لإضافته."
              : "If the account belongs to someone else and can't be merged into yours, it needs a technical hook-up — contact the developer to add it."}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold text-hajr-navy">
            {isAr ? "القاعدة التي يجب تذكّرها" : "The rule to remember"}
          </h3>
          <p className="text-muted-foreground">
            {isAr
              ? "«السعة» أدناه = عدد المعلّمين الذين يتشاركون المستضيف في أوقات مختلفة (تنظيمية فقط). أما «الحصص المتزامنة» فهي الحد الحقيقي: مستخدم Zoom مرخّص = حصة واحدة في نفس اللحظة. عشرة معلّمين على مستضيف واحد لا مشكلة فيهم ما داموا لا يدرّسون في نفس الوقت."
              : "“Capacity” below = how many teachers share this host at different times (organisational only). “Simultaneous classes” is the hard limit: one licensed Zoom user = one meeting at a time. Ten teachers on one host is fine as long as they never teach at the same hour."}
          </p>
        </section>
      </CardContent>
    </Card>
  );
}

function TestButton({ id, isAr, onDone }: { id: string; isAr: boolean; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await testZoomAccountAction(id);
          if (res.ok) toast.success((isAr ? "نجح: " : "OK: ") + (res.data.accountEmail ?? res.data.message));
          else toast.error(res.error);
          onDone();
        })
      }
    >
      {isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Wifi className="me-2 h-4 w-4" />}
      {isAr ? "اختبار" : "Test"}
    </Button>
  );
}

function DeleteButton({
  id, label, disabled, isAr, onDone,
}: { id: string; label: string; disabled: boolean; isAr: boolean; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-hajr-rose hover:bg-hajr-rose/10"
      disabled={isPending}
      title={
        disabled
          ? isAr ? "انقل المعلّمين إلى حساب آخر أولاً" : "Move the teachers to another account first"
          : isAr ? "حذف" : "Delete"
      }
      onClick={() => {
        if (disabled) {
          toast.error(
            isAr
              ? "لا يمكن الحذف: هناك معلّمون معيَّنون على هذا الحساب. انقلهم أولاً."
              : "Can't delete: teachers are still assigned to this account. Move them first."
          );
          return;
        }
        if (!window.confirm(isAr ? `حذف «${label}» نهائياً؟` : `Delete “${label}” permanently?`)) return;
        startTransition(async () => {
          const res = await deleteZoomAccountAction(id);
          if (res.ok) toast.success(isAr ? "تم الحذف" : "Deleted");
          else toast.error(res.error);
          onDone();
        });
      }}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

const formSchema = z.object({
  label: z.string().min(1),
  hostEmail: z.string().email(),
  capacity: z.union([z.coerce.number().int().min(1).max(50), z.literal("")]).optional(),
  maxConcurrent: z.union([z.coerce.number().int().min(1).max(10), z.literal("")]).optional(),
  accountId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

function FormDialog({ isAr, row, onClose, onDone }: { isAr: boolean; row?: Row; onClose: () => void; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [advanced, setAdvanced] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: row?.label ?? "",
      hostEmail: row?.hostEmail ?? "",
      capacity: row?.capacity ?? 6,
      maxConcurrent: row?.maxConcurrent ?? 1,
    } as any,
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const payload = {
        label: data.label,
        hostEmail: data.hostEmail,
        capacity: typeof data.capacity === "number" ? data.capacity : 6,
        maxConcurrent: typeof data.maxConcurrent === "number" ? data.maxConcurrent : 1,
        accountId: data.accountId?.trim() || undefined,
        clientId: data.clientId?.trim() || undefined,
        clientSecret: data.clientSecret?.trim() || undefined,
      };
      const res = row
        ? await updateZoomAccountAction({ id: row.id, ...payload })
        : await createZoomAccountAction(payload);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(isAr ? "تم الحفظ" : "Saved");
      onDone();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? (isAr ? "تعديل حساب Zoom" : "Edit Zoom account") : (isAr ? "إضافة حساب Zoom" : "Add Zoom account")}</DialogTitle>
          <DialogDescription>
            {isAr
              ? "بريد المضيف هو بريد مستخدم Zoom مرخّص موجود فعلاً. اضغط «اختبار» بعد الحفظ للتأكد."
              : "The host email must be an existing licensed Zoom user. Hit “Test” after saving to confirm."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label={isAr ? "الاسم" : "Label"} error={errors.label?.message}>
            <Input placeholder={isAr ? "حساب Zoom ٢" : "Zoom Account 2"} {...register("label")} />
          </Field>
          <Field label={isAr ? "بريد المضيف (مستخدم Zoom)" : "Host email (Zoom user)"} error={errors.hostEmail?.message}>
            <Input dir="ltr" type="email" placeholder="teacher2@hajracademy.com" {...register("hostEmail")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={isAr ? "السعة (معلّمون)" : "Capacity (teachers)"}
              error={errors.capacity?.message as string | undefined}
              hint={isAr ? "تنظيمي فقط — لا يُفرض" : "Guideline only — not enforced"}
            >
              <Input type="number" min={1} max={50} {...register("capacity")} />
            </Field>
            <Field
              label={isAr ? "حصص متزامنة" : "Simultaneous classes"}
              error={errors.maxConcurrent?.message as string | undefined}
              hint={isAr ? "اتركها ١ إلا مع إضافة Zoom المدفوعة" : "Keep 1 unless you bought Zoom's add-on"}
            >
              <Input type="number" min={1} max={10} {...register("maxConcurrent")} />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="text-sm font-medium text-hajr-rose hover:underline"
          >
            {advanced ? "▾ " : "▸ "}
            {isAr ? "مفاتيح Zoom خاصة — للمطوّر فقط" : "Own Zoom keys — developer only"}
          </button>

          {advanced && (
            <div className="space-y-3 rounded-card border border-hajr-border bg-hajr-ivory p-3">
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "لحساب Zoom منفصل بتسجيل دخول آخر. لا تحتاج هذه الخانات عند إضافة مستخدم داخل حسابك — اتركها فارغة."
                  : "For a separate Zoom account with a different login. Not needed when adding a user inside your own account — leave blank."}
              </p>
              <Field label="Account ID"><Input dir="ltr" {...register("accountId")} /></Field>
              <Field label="Client ID"><Input dir="ltr" {...register("clientId")} /></Field>
              <Field label={row ? "Client Secret " + (isAr ? "(اتركه فارغاً للإبقاء على الحالي)" : "(blank = keep current)") : "Client Secret"}>
                <Input dir="ltr" type="password" autoComplete="new-password" {...register("clientSecret")} />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, error, hint, children,
}: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
