"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Send, BookOpenCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface BrandAsset {
  id: string;
  type: string;
  name: string;
  nameAr: string;
  category: string;
  url: string;
  downloadUrl: string;
  description: string | null;
  descriptionAr: string | null;
}

export function BrandKitClient({ assets }: { assets: BrandAsset[] }) {
  const t = useTranslations("BrandKit");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const grouped = assets.reduce<Record<string, BrandAsset[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  async function sendBook() {
    if (!email.trim()) return toast.error(t("emailRequired"));
    setBusy(true);
    try {
      const r = await fetch("/api/admin/brand-kit/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), note: note.trim() || undefined }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "failed");
      const j = await r.json();
      toast.success(j.mocked ? t("sentMocked") : t("sentSuccess"));
      setEmail("");
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-brand-navy text-white border-brand-navy">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4">
          <div className="grow">
            <div className="flex items-center gap-2 text-brand-mint">
              <BookOpenCheck className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wider font-semibold">
                {t("brandBook")}
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-2">
              {t("downloadBookTitle")}
            </h2>
            <p className="text-sm text-brand-mint mt-1 opacity-90">
              {t("downloadBookSubtitle")}
            </p>
          </div>
          <a href="/api/admin/brand-kit/book" download>
            <Button className="bg-brand-rose hover:bg-brand-rose/90 text-white min-h-[44px]">
              <Download className="h-4 w-4 me-2" />
              {t("downloadBook")}
            </Button>
          </a>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-navy mb-3">
            {t(`category${cat.charAt(0) + cat.slice(1).toLowerCase()}`, {
              fallback: cat,
            } as any)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((a) => (
              <Card key={a.id} className="border-brand-mint">
                <CardHeader>
                  <CardTitle className="text-base text-brand-navy">
                    {isAr ? a.nameAr : a.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="aspect-video rounded-md border bg-brand-ivory flex items-center justify-center overflow-hidden">
                    {a.url.match(/\.(svg|png|jpe?g|webp)$/i) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt={a.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <BookOpenCheck className="h-10 w-10 text-brand-rose" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {isAr ? a.descriptionAr : a.description}
                  </p>
                  <a
                    href={a.downloadUrl}
                    target={a.downloadUrl.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    download={!a.downloadUrl.startsWith("http")}
                    className="inline-flex w-full"
                  >
                    <Button variant="outline" className="w-full min-h-[44px]">
                      <Download className="h-4 w-4 me-2" />
                      {t("download")}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brand-navy text-lg">
            <Send className="h-4 w-4 text-brand-rose" />
            {t("sendToDesigner")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="email"
            placeholder={t("designerEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Textarea
            placeholder={t("optionalNote")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={sendBook}
              disabled={busy}
              className="bg-brand-navy text-white"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Send className="h-4 w-4 me-2" />
              )}
              {t("send")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
