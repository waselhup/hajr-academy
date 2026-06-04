"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, KeyRound, User as UserIcon } from "lucide-react";
import { updateProfileAction, changePasswordAction } from "./_actions";

export type ProfileData = {
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  birthDate: string | null;
  gender: "MALE" | "FEMALE" | null;
  englishLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  activePackage: string | null;
  activeClass: {
    name: string;
    nameAr: string | null;
    programNameEn: string;
    programNameAr: string;
    programCode: string;
  } | null;
};

export function ProfileClient({ initial }: { initial: ProfileData }) {
  const t = useTranslations("StudentProfile");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [saving, startSave] = useTransition();
  const [pwdOpen, setPwdOpen] = useState(false);

  const dirty = name !== initial.name || phone !== initial.phone;

  function handleSave() {
    if (!dirty) return;
    startSave(async () => {
      const res = await updateProfileAction({ name, phone });
      if (res.ok) {
        toast.success(t("savedToast"));
      } else {
        toast.error(
          res.error === "INVALID_PHONE"
            ? t("errInvalidPhone")
            : t("errSaveFailed")
        );
      }
    });
  }

  // Birth date display in the user's locale, dates only.
  const birthDateDisplay = initial.birthDate
    ? new Intl.DateTimeFormat(isAr ? "ar-SA-u-nu-latn" : "en-GB", {
        dateStyle: "long",
      }).format(new Date(initial.birthDate))
    : "—";

  const className = initial.activeClass
    ? isAr
      ? initial.activeClass.nameAr ?? initial.activeClass.name
      : initial.activeClass.name
    : null;
  const programLabel = initial.activeClass
    ? isAr
      ? initial.activeClass.programNameAr
      : initial.activeClass.programNameEn
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* Identity card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("identity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-hajr-deep-navy/10 text-hajr-deep-navy">
              <UserIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="truncate text-lg font-semibold">
                {initial.name || "—"}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {initial.email}
              </div>
              {programLabel && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="info">{programLabel}</Badge>
                  {className && (
                    <span className="text-xs text-muted-foreground">
                      {className}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("editable")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name">{t("name")}</Label>
              <Input
                id="prof-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-phone">{t("phone")}</Label>
              <Input
                id="prof-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+9665XXXXXXXX"
                disabled={saving}
                dir="ltr"
                className="num"
              />
              <p className="text-xs text-muted-foreground">
                {t("phoneHint")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="bg-hajr-deep-navy text-white"
            >
              {saving ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-2 h-4 w-4" />
              )}
              {t("save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPwdOpen(true)}
              disabled={saving}
            >
              <KeyRound className="me-2 h-4 w-4" />
              {t("changePassword")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Read-only fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("readOnly")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <ReadField label={t("email")} value={initial.email} />
            <ReadField label={t("birthDate")} value={birthDateDisplay} />
            <ReadField
              label={t("gender")}
              value={
                initial.gender
                  ? t(`gender_${initial.gender}` as "gender_MALE" | "gender_FEMALE")
                  : "—"
              }
            />
            <ReadField
              label={t("englishLevel")}
              value={initial.englishLevel ?? "—"}
            />
            <ReadField
              label={t("activePackage")}
              value={initial.activePackage ?? "—"}
            />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("readOnlyHint")}
          </p>
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onClose,
  t,
  tCommon,
}: {
  open: boolean;
  onClose: () => void;
  t: (k: string) => string;
  tCommon: (k: string) => string;
}) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startPwd] = useTransition();

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  function submit() {
    if (newPassword.length < 8) {
      toast.error(t("errPwdShort"));
      return;
    }
    if (newPassword !== confirm) {
      toast.error(t("errPwdMismatch"));
      return;
    }
    startPwd(async () => {
      const res = await changePasswordAction({ currentPassword, newPassword });
      if (res.ok) {
        toast.success(t("pwdChangedToast"));
        reset();
        onClose();
      } else if (res.error === "WRONG_PASSWORD") {
        toast.error(t("errWrongPwd"));
      } else if (res.error === "SAME_PASSWORD") {
        toast.error(t("errSamePwd"));
      } else {
        toast.error(t("errSaveFailed"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("changePassword")}</DialogTitle>
          <DialogDescription>{t("changePwdHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pwd-current">{t("currentPassword")}</Label>
            <Input
              id="pwd-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={pending}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd-new">{t("newPassword")}</Label>
            <Input
              id="pwd-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNext(e.target.value)}
              disabled={pending}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd-confirm">{t("confirmPassword")}</Label>
            <Input
              id="pwd-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={pending}
              autoComplete="new-password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={
              pending ||
              !currentPassword ||
              !newPassword ||
              !confirm
            }
            className="bg-hajr-deep-navy text-white"
          >
            {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("confirmChange")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
