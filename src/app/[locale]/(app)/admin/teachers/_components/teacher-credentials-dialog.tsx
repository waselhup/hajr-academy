"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Check, Copy, KeyRound } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * One-time credential panel shown to the admin after creating a teacher or
 * resetting their password. The admin delivers these manually (WhatsApp/email);
 * the plaintext password is never stored or shown again.
 */
export function TeacherCredentialsDialog({
  username,
  tempPassword,
  onClose,
}: {
  username: string;
  tempPassword: string;
  onClose: () => void;
}) {
  const isAr = useLocale() === "ar";
  const [copied, setCopied] = useState<"user" | "pass" | "both" | null>(null);

  function copy(text: string, which: "user" | "pass" | "both") {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 1800);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-hajr-success" />
            {isAr ? "بيانات الدخول" : "Login details"}
          </DialogTitle>
          <DialogDescription>
            {isAr
              ? "انسخ هذه البيانات الآن وسلّمها للمعلّم. لن تظهر كلمة المرور مرة أخرى."
              : "Copy these now and give them to the teacher. The password won't be shown again."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <CredRow
            label={isAr ? "اسم المستخدم" : "Username"}
            value={username}
            copied={copied === "user"}
            onCopy={() => copy(username, "user")}
            isAr={isAr}
          />
          <CredRow
            label={isAr ? "كلمة المرور المؤقتة" : "Temporary password"}
            value={tempPassword}
            copied={copied === "pass"}
            onCopy={() => copy(tempPassword, "pass")}
            isAr={isAr}
            mono
          />
          <p className="rounded-lg bg-hajr-warning/10 px-3 py-2 text-xs text-hajr-warning">
            {isAr
              ? "اطلب من المعلّم تغيير كلمة المرور بعد أول تسجيل دخول."
              : "Ask the teacher to change this password after their first login."}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => copy(`${username}\n${tempPassword}`, "both")}>
            {copied === "both" ? <Check className="me-1.5 h-4 w-4" /> : <Copy className="me-1.5 h-4 w-4" />}
            {isAr ? "نسخ الاثنين" : "Copy both"}
          </Button>
          <Button type="button" onClick={onClose}>{isAr ? "تم" : "Done"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredRow({
  label, value, copied, onCopy, isAr, mono,
}: {
  label: string; value: string; copied: boolean; onCopy: () => void; isAr: boolean; mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-hajr-muted">{label}</div>
      <div className="flex items-center gap-2">
        <code dir="ltr" className={`flex-1 select-all rounded-lg border border-hajr-border bg-hajr-ivory px-3 py-2 text-sm text-hajr-text ${mono ? "font-mono tracking-wide" : ""}`}>
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={onCopy} className="shrink-0">
          {copied ? <Check className="me-1.5 h-4 w-4" /> : <Copy className="me-1.5 h-4 w-4" />}
          {isAr ? (copied ? "تم" : "نسخ") : copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
