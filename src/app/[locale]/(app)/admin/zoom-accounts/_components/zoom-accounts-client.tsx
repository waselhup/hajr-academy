"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Video, Users, CheckCircle2, AlertTriangle, Wifi } from "lucide-react";
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
} from "../../_actions/zoom-accounts";

type Row = {
  id: string;
  label: string;
  hostEmail: string;
  capacity: number;
  isActive: boolean;
  ownCreds: boolean;
  teacherCount: number;
  lastCheckOk: boolean | null;
  lastCheckedAt: string | null;
};

export function ZoomAccountsClient({ rows, envConfigured }: { rows: Row[]; envConfigured: boolean }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? "حسابات Zoom" : "Zoom Accounts"}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "اربط حسابات Zoom وعيّن لكل معلّم حساباً (6 معلّمين كحد أقصى لكل حساب)."
              : "Connect Zoom accounts and assign each teacher to one (max 6 teachers per account)."}
          </p>
        </div>
        <Button variant="cta" onClick={() => setCreating(true)}>
          <Plus className="me-2 h-4 w-4" />
          {isAr ? "إضافة حساب" : "Add account"}
        </Button>
      </div>

      {!envConfigured && (
        <div className="flex items-start gap-2 rounded-card border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {isAr
              ? "اتصال Zoom الرئيسي غير مهيّأ على الخادم بعد. الحسابات التي تستخدم \"الاتصال الرئيسي\" لن تعمل حتى يتم ضبطه."
              : "The main Zoom connection isn't configured on the server yet. Accounts that reuse the “main connection” won't work until it is set."}
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {isAr ? "لا توجد حسابات Zoom بعد. اضغط “إضافة حساب”." : "No Zoom accounts yet. Click “Add account”."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => {
            const full = a.teacherCount >= a.capacity;
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
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className={full ? "font-semibold text-hajr-rose num" : "font-semibold num"}>
                        {a.teacherCount} / {a.capacity}
                      </span>
                      <span className="text-xs text-muted-foreground">{isAr ? "معلّم" : "teachers"}</span>
                    </span>
                    <Badge variant={a.ownCreds ? "info" : "default"}>
                      {a.ownCreds ? (isAr ? "مفاتيح خاصة" : "Own keys") : (isAr ? "الاتصال الرئيسي" : "Main connection")}
                    </Badge>
                  </div>

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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {creating && <FormDialog isAr={isAr} onClose={() => setCreating(false)} onDone={() => router.refresh()} />}
      {editing && (
        <FormDialog isAr={isAr} row={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />
      )}
    </div>
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

const formSchema = z.object({
  label: z.string().min(1),
  hostEmail: z.string().email(),
  capacity: z.union([z.coerce.number().int().min(1).max(50), z.literal("")]).optional(),
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
    } as any,
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const payload = {
        label: data.label,
        hostEmail: data.hostEmail,
        capacity: typeof data.capacity === "number" ? data.capacity : 6,
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
            {isAr ? "الحد الأقصى لكل حساب هو عدد المعلّمين الذين يدرّسون في أوقات مختلفة." : "Capacity = how many teachers (at different times) share this account."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label={isAr ? "الاسم" : "Label"} error={errors.label?.message}>
            <Input placeholder={isAr ? "حساب Zoom 1" : "Zoom Account 1"} {...register("label")} />
          </Field>
          <Field label={isAr ? "بريد المضيف (Zoom)" : "Host email (Zoom user)"} error={errors.hostEmail?.message}>
            <Input dir="ltr" type="email" placeholder="teacher1@zoom-host.com" {...register("hostEmail")} />
          </Field>
          <Field label={isAr ? "السعة (عدد المعلّمين)" : "Capacity (teachers)"} error={errors.capacity?.message as string | undefined}>
            <Input type="number" min={1} max={50} {...register("capacity")} />
          </Field>

          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="text-sm font-medium text-hajr-rose hover:underline"
          >
            {advanced ? "▾ " : "▸ "}
            {isAr ? "هذا الحساب له تسجيل دخول Zoom خاص به (متقدّم)" : "This account has its own Zoom login (advanced)"}
          </button>

          {advanced && (
            <div className="space-y-3 rounded-card border border-hajr-border bg-hajr-ivory p-3">
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "أدخل مفاتيح تطبيق Server-to-Server OAuth الخاص بهذا الحساب. اتركها فارغة لاستخدام الاتصال الرئيسي."
                  : "Enter this account's Server-to-Server OAuth app keys. Leave blank to reuse the main connection."}
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
