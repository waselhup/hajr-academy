"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, KeyRound } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * One-time credential panel shown to the approving admin after a Success Partner
 * (marketer) is approved. Displays the generated username + temporary password so
 * the admin can deliver them MANUALLY (WhatsApp/email). The system never sends
 * them automatically, and the plaintext password is never stored or re-shown.
 */
export function CredentialsDialog({
  username,
  tempPassword,
  onClose,
}: {
  username: string;
  tempPassword: string;
  onClose: () => void;
}) {
  const t = useTranslations("Marketer");
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
            {t("credentialsTitle")}
          </DialogTitle>
          <DialogDescription>{t("credentialsIntro")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <CredRow
            label={t("credentialUsername")}
            value={username}
            copied={copied === "user"}
            onCopy={() => copy(username, "user")}
            copyLabel={t("credentialCopy")}
            copiedLabel={t("credentialCopied")}
          />
          <CredRow
            label={t("credentialPassword")}
            value={tempPassword}
            copied={copied === "pass"}
            onCopy={() => copy(tempPassword, "pass")}
            copyLabel={t("credentialCopy")}
            copiedLabel={t("credentialCopied")}
            mono
          />

          <p className="rounded-lg bg-hajr-warning/10 px-3 py-2 text-xs text-hajr-warning">
            {t("credentialChangeNote")}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => copy(`${username}\n${tempPassword}`, "both")}
          >
            {copied === "both" ? (
              <>
                <Check className="me-1.5 h-4 w-4" />
                {t("credentialCopied")}
              </>
            ) : (
              <>
                <Copy className="me-1.5 h-4 w-4" />
                {t("credentialCopyBoth")}
              </>
            )}
          </Button>
          <Button type="button" onClick={onClose}>
            {t("credentialDone")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredRow({
  label, value, copied, onCopy, copyLabel, copiedLabel, mono,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-hajr-muted">{label}</div>
      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className={`flex-1 select-all rounded-lg border border-hajr-border bg-hajr-ivory px-3 py-2 text-sm text-hajr-text ${
            mono ? "font-mono tracking-wide" : ""
          }`}
        >
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={onCopy} className="shrink-0">
          {copied ? (
            <>
              <Check className="me-1.5 h-4 w-4" />
              {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="me-1.5 h-4 w-4" />
              {copyLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
