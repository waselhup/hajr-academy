"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check } from "lucide-react";

interface Prefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  classReminders: boolean;
  paymentAlerts: boolean;
  attendanceUpdates: boolean;
  labFeedback: boolean;
  marketingMessages: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

const CHANNELS: { key: keyof Prefs; labelKey: string }[] = [
  { key: "emailEnabled", labelKey: "email" },
  { key: "smsEnabled", labelKey: "sms" },
  { key: "whatsappEnabled", labelKey: "whatsapp" },
  { key: "inAppEnabled", labelKey: "inApp" },
];

const CATEGORIES: { key: keyof Prefs; labelKey: string }[] = [
  { key: "classReminders", labelKey: "classReminders" },
  { key: "paymentAlerts", labelKey: "paymentAlerts" },
  { key: "attendanceUpdates", labelKey: "attendanceUpdates" },
  { key: "labFeedback", labelKey: "labFeedback" },
  { key: "marketingMessages", labelKey: "marketing" },
];

export function NotificationSettingsClient() {
  const t = useTranslations("NotifSettings");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/notifications");
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);
      }
    })();
  }, []);

  function toggle(key: keyof Prefs) {
    setPrefs((p) => (p ? { ...p, [key]: !p[key] } : p));
    setSaved(false);
  }

  function setQuiet(field: "quietHoursStart" | "quietHoursEnd", v: string) {
    setPrefs((p) => (p ? { ...p, [field]: v || null } : p));
    setSaved(false);
  }

  async function save() {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand-rose" />
      </div>
    );
  }

  const Row = ({ k, label }: { k: keyof Prefs; label: string }) => (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm">{label}</span>
      <Switch
        checked={Boolean(prefs[k])}
        onCheckedChange={() => toggle(k)}
      />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("channels")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {CHANNELS.map((c) => (
            <Row key={c.key} k={c.key} label={t(c.labelKey)} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("categories")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {CATEGORIES.map((c) => (
            <Row key={c.key} k={c.key} label={t(c.labelKey)} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("quietHours")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("quietHoursDesc")}
          </p>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                {t("from")}
              </label>
              <Input
                type="time"
                value={prefs.quietHoursStart ?? ""}
                onChange={(e) => setQuiet("quietHoursStart", e.target.value)}
                className="mt-1 w-32"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("to")}</label>
              <Input
                type="time"
                value={prefs.quietHoursEnd ?? ""}
                onChange={(e) => setQuiet("quietHoursEnd", e.target.value)}
                className="mt-1 w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-hajr-deep-navy text-white"
        >
          {saving ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : null}
          {t("save")}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-brand-mint">
            <Check className="h-4 w-4" />
            {t("saved")}
          </span>
        )}
      </div>
    </div>
  );
}
