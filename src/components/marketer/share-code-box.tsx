"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, MessageCircle } from "lucide-react";

type Props = {
  code: string;
  landingUrl: string;
};

export function ShareCodeBox({ code, landingUrl }: Props) {
  const t = useTranslations("Marketer");
  const [copied, setCopied] = useState(false);

  const fullUrl = `${landingUrl}?ref=${encodeURIComponent(code)}`;
  const message = t("whatsappShareMessage", { url: fullUrl });
  const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="rounded-2xl bg-hajr-deep-navy p-5 text-white shadow-card-hover">
      <div className="text-xs uppercase tracking-widest text-hajr-mint/80">{t("yourReferralCode")}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="text-3xl font-bold tracking-[0.4em] text-white">{code}</div>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex h-11 min-w-[44px] items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/20"
          aria-label={t("copyCode")}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? t("codeCopied") : t("copyCode")}</span>
        </button>
      </div>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-hajr-rose px-4 text-sm font-semibold text-white shadow transition hover:opacity-90"
      >
        <MessageCircle className="h-4 w-4" />
        {t("shareWhatsapp")}
      </a>
    </div>
  );
}
