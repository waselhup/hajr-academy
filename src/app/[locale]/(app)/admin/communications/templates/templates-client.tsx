"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Send } from "lucide-react";

interface Template {
  id: string;
  key: string;
  subjectAr: string;
  subjectEn: string;
  bodyAr: string;
  bodyEn: string;
  variables: string[];
  category: string;
  isActive: boolean;
}

export function TemplatesClient() {
  const t = useTranslations("Comms");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comms/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/comms/templates/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectEn: editing.subjectEn,
          subjectAr: editing.subjectAr,
          bodyEn: editing.bodyEn,
          bodyAr: editing.bodyAr,
        }),
      });
      if (res.ok) {
        setEditing(null);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function testSend(tpl: Template) {
    setTestResult(null);
    const res = await fetch(`/api/admin/comms/templates/${tpl.id}/test`, {
      method: "POST",
    });
    const data = await res.json();
    setTestResult(
      data.ok
        ? `${t("testSent")} → ${data.sentTo}${data.mocked ? " (mock)" : ""}`
        : data.error ?? t("testFailed")
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand-rose" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {testResult && (
        <Card className="border-brand-mint bg-brand-mint/10">
          <CardContent className="p-3 text-sm">{testResult}</CardContent>
        </Card>
      )}
      {templates.map((tpl) => (
        <Card key={tpl.id}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-mono text-sm font-medium">{tpl.key}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{tpl.category}</Badge>
                <span>{tpl.subjectEn}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testSend(tpl)}
              >
                <Send className="me-1 h-3.5 w-3.5" />
                {t("testSend")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(tpl)}>
                <Pencil className="me-1 h-3.5 w-3.5" />
                {t("edit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {editing?.key}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("variables")}:{" "}
                {editing.variables.map((v) => `{{${v}}}`).join(", ") || "—"}
              </p>
              <div>
                <label className="text-sm font-medium">
                  {t("subject")} (EN)
                </label>
                <Input
                  value={editing.subjectEn}
                  onChange={(e) =>
                    setEditing({ ...editing, subjectEn: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("subject")} (AR)
                </label>
                <Input
                  value={editing.subjectAr}
                  onChange={(e) =>
                    setEditing({ ...editing, subjectAr: e.target.value })
                  }
                  dir="rtl"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("body")} (EN)</label>
                <Textarea
                  rows={6}
                  value={editing.bodyEn}
                  onChange={(e) =>
                    setEditing({ ...editing, bodyEn: e.target.value })
                  }
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("body")} (AR)</label>
                <Textarea
                  rows={6}
                  value={editing.bodyAr}
                  onChange={(e) =>
                    setEditing({ ...editing, bodyAr: e.target.value })
                  }
                  dir="rtl"
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-hajr-deep-navy text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
