"use client";

/**
 * Feedback Bank composer (client). Author title + body in EN & AR, pick
 * students/parents via the shared multi-select UX (search + select-all/clear +
 * checkbox list, with a STUDENT/PARENT segment filter), then send over the
 * existing notify pipe. Loading / empty / error states + toast on send.
 */
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Send, Users, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendFeedbackAction } from "@/lib/feedback-bank/actions";

export interface Recipient {
  id: string;
  name: string;
  role: "STUDENT" | "PARENT";
  email: string;
}

type RoleFilter = "ALL" | "STUDENT" | "PARENT";

export function FeedbackBankClient({ recipients }: { recipients: Recipient[] }) {
  const t = useTranslations("FeedbackBank");
  const locale = useLocale();
  const ar = locale === "ar";
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [body, setBody] = useState("");
  const [bodyAr, setBodyAr] = useState("");

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipients.filter((r) => {
      if (roleFilter !== "ALL" && r.role !== roleFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
  }, [recipients, roleFilter, query]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectAllFiltered = () =>
    setSelectedIds((prev) => [...new Set([...prev, ...filtered.map((r) => r.id)])]);

  const clearSelection = () => setSelectedIds([]);

  const roleLabel = (r: "STUDENT" | "PARENT") => (r === "STUDENT" ? t("roleStudent") : t("roleParent"));

  const onSend = () => {
    if (!body.trim() && !bodyAr.trim()) {
      toast.error(t("bodyRequired"));
      return;
    }
    if (selectedIds.length === 0) {
      toast.error(t("recipientsRequired"));
      return;
    }
    startTransition(async () => {
      const res = await sendFeedbackAction({
        title: title.trim(),
        titleAr: titleAr.trim(),
        body: body.trim(),
        bodyAr: bodyAr.trim(),
        userIds: selectedIds,
      });
      if (res.ok) {
        toast.success(t("sentOk", { count: res.count }));
        setTitle("");
        setTitleAr("");
        setBody("");
        setBodyAr("");
        setSelectedIds([]);
        setQuery("");
      } else {
        toast.error(t("sendError"));
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Compose */}
      <Card className="space-y-4 p-5">
        <div className="text-sm font-semibold text-hajr-navy">{t("composeTitle")}</div>

        <div className="space-y-1.5">
          <Label htmlFor="fb-title">{t("titleEn")}</Label>
          <Input id="fb-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fb-title-ar">{t("titleArLabel")}</Label>
          <Input id="fb-title-ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fb-body">
            {t("bodyEn")} <span className="text-hajr-rose">*</span>
          </Label>
          <Textarea id="fb-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fb-body-ar">{t("bodyArLabel")}</Label>
          <Textarea id="fb-body-ar" dir="rtl" rows={5} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} />
        </div>
        <p className="text-xs text-hajr-muted">{t("channelsNote")}</p>
      </Card>

      {/* Recipients */}
      <Card className="flex flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-hajr-navy">{t("recipientsTitle")}</span>
          <span className="text-xs text-hajr-muted">
            <span className="num">{selectedIds.length}</span> {t("selected")}
          </span>
        </div>

        {/* role segment */}
        <div className="mb-3 flex flex-wrap gap-2">
          {(["ALL", "STUDENT", "PARENT"] as RoleFilter[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                roleFilter === r
                  ? "border-hajr-deep-navy bg-hajr-deep-navy text-white"
                  : "border-hajr-border bg-white text-hajr-body hover:bg-hajr-hover"
              )}
            >
              {r === "ALL" ? t("filterAll") : r === "STUDENT" ? t("roleStudents") : t("roleParents")}
            </button>
          ))}
        </div>

        {/* search + select-all/clear */}
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-hajr-light ltr:left-2.5 rtl:right-2.5" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchRecipients")}
              className="ltr:pl-8 rtl:pr-8"
            />
          </div>
        </div>
        <div className="mb-2 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={selectAllFiltered}
            disabled={filtered.length === 0 || allFilteredSelected}
          >
            {t("selectAll")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
          >
            {t("clearSelection")}
          </Button>
        </div>

        {/* list */}
        <div className="max-h-72 flex-1 space-y-1 overflow-y-auto rounded-md border border-hajr-border bg-white p-1">
          {recipients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Inbox className="h-8 w-8 text-hajr-light" />
              <p className="text-xs text-hajr-muted">{t("noRecipients")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-hajr-muted">{t("noMatch")}</p>
          ) : (
            filtered.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-hajr-hover"
              >
                <Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-hajr-surface text-xs font-semibold text-hajr-navy">
                  {r.role === "STUDENT" ? <Users className="h-3.5 w-3.5" /> : r.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-hajr-light">
                  {roleLabel(r.role)}
                </span>
              </label>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="cta" size="sm" onClick={onSend} disabled={pending}>
            {pending ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="me-1.5 h-4 w-4 rtl-flip" />
            )}
            {t("send")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
