"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, ExternalLink, Download, Image as ImageIcon, Save } from "lucide-react";
import type { ValidationCategory } from "@/lib/validation/teacher-requests";
import { toast } from "sonner";

interface SignOff {
  verified: boolean;
  signedByName: string;
  notes: string;
}

export function ValidationClient({ categories }: { categories: ValidationCategory[] }) {
  const t = useTranslations("ValidationMode");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [signoffs, setSignoffs] = useState<Record<string, SignOff>>(() => {
    const init: Record<string, SignOff> = {};
    for (const c of categories) {
      init[c.key] = { verified: false, signedByName: "", notes: "" };
    }
    return init;
  });

  function update<K extends keyof SignOff>(key: string, field: K, value: SignOff[K]) {
    setSignoffs((s) => ({ ...s, [key]: { ...s[key], [field]: value } }));
  }

  function exportReport() {
    const params = new URLSearchParams();
    params.set(
      "data",
      btoa(unescape(encodeURIComponent(JSON.stringify(signoffs))))
    );
    window.open(`/api/admin/validation/export?${params.toString()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <Card className="bg-brand-navy text-white border-brand-navy">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start gap-3">
          <div className="grow">
            <div className="flex items-center gap-2 text-brand-mint text-xs uppercase tracking-wider font-semibold">
              <Target className="h-4 w-4" />
              {t("pretitle")}
            </div>
            <h2 className="text-xl font-bold mt-1">{t("heroTitle")}</h2>
            <p className="text-sm text-brand-mint mt-1 opacity-90">
              {t("heroSubtitle")}
            </p>
          </div>
          <Button
            onClick={exportReport}
            className="bg-brand-rose hover:bg-brand-rose/90 text-white min-h-[44px]"
          >
            <Download className="h-4 w-4 me-2" />
            {t("exportReport")}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue={categories[0]?.key}>
        <TabsList className="flex flex-wrap h-auto bg-brand-ivory">
          {categories.map((c) => (
            <TabsTrigger
              key={c.key}
              value={c.key}
              className="text-xs data-[state=active]:bg-brand-navy data-[state=active]:text-white"
            >
              <span className="text-brand-rose me-1">S{c.sprint}</span>
              {isAr ? c.titleAr : c.title}
              {signoffs[c.key]?.verified && <span className="ms-1">✓</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((c) => {
          const so = signoffs[c.key];
          const bullets = isAr ? c.deliveredAsAr : c.deliveredAs;
          return (
            <TabsContent key={c.key} value={c.key} className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-brand-navy text-lg">
                    {isAr ? c.titleAr : c.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Sprint {c.sprint}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-rose mb-2">
                      {t("teacherRequest")}
                    </h4>
                    <blockquote className="border-s-4 border-brand-mint ps-3 italic text-sm">
                      "{isAr ? c.originalRequestAr : c.originalRequest}"
                    </blockquote>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-rose mb-2">
                      ✅ {t("deliveredAs")}
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-brand-mint mt-1">▪</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-rose mb-2">
                      🖥️ {t("tryItNow")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {c.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          target="_blank"
                        >
                          <Button variant="outline" size="sm" className="min-h-[40px]">
                            <ExternalLink className="h-3 w-3 me-1" />
                            {isAr ? l.labelAr : l.label}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-rose mb-2">
                      📷 {t("screenshots")}
                    </h4>
                    <div className="rounded-md border-2 border-dashed border-brand-mint bg-brand-ivory p-6 text-center text-muted-foreground text-xs">
                      <ImageIcon className="h-6 w-6 mx-auto mb-2 text-brand-rose" />
                      {t("screenshotsHint")}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`v-${c.key}`}
                        checked={so?.verified}
                        onCheckedChange={(v) => update(c.key, "verified", !!v)}
                      />
                      <label htmlFor={`v-${c.key}`} className="text-sm font-medium cursor-pointer">
                        {t("verifiedByTeacher")}
                      </label>
                    </div>
                    <Input
                      placeholder={t("teacherName")}
                      value={so?.signedByName ?? ""}
                      onChange={(e) => update(c.key, "signedByName", e.target.value)}
                    />
                    <Textarea
                      placeholder={t("notes")}
                      value={so?.notes ?? ""}
                      onChange={(e) => update(c.key, "notes", e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
