"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Save, EyeOff, Eye } from "lucide-react";

export interface AdminProduct {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr: string | null;
  descEn: string | null;
  priceSar: number;
  compareAtSar: number | null;
  unitAr: string;
  unitEn: string;
  group: string;
  packageType: string | null;
  requiresGradeLevel: boolean;
  isActive: boolean;
  sortOrder: number;
}

const GROUPS = [
  { value: "CORE", ar: "التقوية الفصلية", en: "Term reinforcement" },
  { value: "COURSE", ar: "الدورات", en: "Courses" },
  { value: "SUMMER", ar: "البرنامج الصيفي", en: "Summer" },
];

const PACKAGE_TYPES = [
  "INTEGRATED",
  "ESSENTIAL",
  "PRIVATE",
  "STEP_PREP_PKG",
  "IELTS_PREP_PKG",
  "SCHOOL",
];

const BLANK = {
  slug: "",
  nameAr: "",
  nameEn: "",
  priceSar: 0,
  unitAr: "ر.س / شهر",
  unitEn: "SAR / month",
  group: "COURSE",
  packageType: "INTEGRATED",
  sortOrder: 999,
};

export function ProductsClient({ products }: { products: AdminProduct[] }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...BLANK });
  const [edits, setEdits] = useState<Record<string, Partial<AdminProduct>>>({});

  const setEdit = (id: string, patch: Partial<AdminProduct>) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  async function save(p: AdminProduct) {
    const patch = edits[p.id];
    if (!patch || Object.keys(patch).length === 0) return;
    setBusy(p.id);
    setMsg("");
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, ...patch }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "failed");
      setEdits((e) => {
        const n = { ...e };
        delete n[p.id];
        return n;
      });
      setMsg(isAr ? "تم الحفظ." : "Saved.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  /** Whether this product asks the buyer for the student's school year. */
  async function toggleGradeLevel(p: AdminProduct) {
    setBusy(p.id);
    try {
      await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          requiresGradeLevel: !p.requiresGradeLevel,
        }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(p: AdminProduct) {
    setBusy(p.id);
    try {
      await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    setBusy("new");
    setMsg("");
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, priceSar: Number(draft.priceSar) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "failed");
      setDraft({ ...BLANK });
      setCreating(false);
      setMsg(isAr ? "تمت الإضافة." : "Product added.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: products.filter((p) => p.group === g.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {isAr ? "المنتجات والأسعار" : "Products & pricing"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr
              ? "هذه الأسعار هي ما يظهر في الموقع وما يُخصم من العميل — لا يوجد مكان آخر لتعديلها."
              : "These prices are what the site shows and what the customer is charged — there is no second place to edit them."}
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)} variant="outline">
          <Plus className="me-2 h-4 w-4" />
          {isAr ? "منتج جديد" : "New product"}
        </Button>
      </div>

      {msg && (
        <div className="rounded-lg border border-hajr-border bg-muted/40 p-3 text-sm">
          {msg}
        </div>
      )}

      {creating && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold">
              {isAr ? "إضافة منتج" : "Add a product"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{isAr ? "المعرّف (إنجليزي بشرطات)" : "Slug"}</Label>
                <Input
                  dir="ltr"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft({ ...draft, slug: e.target.value.toLowerCase() })
                  }
                  placeholder="summer-group-starter"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "السعر (ر.س)" : "Price (SAR)"}</Label>
                <Input
                  dir="ltr"
                  value={String(draft.priceSar)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      priceSar: Number(e.target.value.replace(/[^\d.]/g, "")) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "الاسم بالعربية" : "Arabic name"}</Label>
                <Input
                  value={draft.nameAr}
                  onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "الاسم بالإنجليزية" : "English name"}</Label>
                <Input
                  dir="ltr"
                  value={draft.nameEn}
                  onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "الوحدة (عربي)" : "Unit (Arabic)"}</Label>
                <Input
                  value={draft.unitAr}
                  onChange={(e) => setDraft({ ...draft, unitAr: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "الوحدة (إنجليزي)" : "Unit (English)"}</Label>
                <Input
                  dir="ltr"
                  value={draft.unitEn}
                  onChange={(e) => setDraft({ ...draft, unitEn: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "القسم" : "Section"}</Label>
                <select
                  className="h-10 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm"
                  value={draft.group}
                  onChange={(e) => setDraft({ ...draft, group: e.target.value })}
                >
                  {GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {isAr ? g.ar : g.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{isAr ? "نوع الباقة (للتجهيز)" : "Package type"}</Label>
                <select
                  className="h-10 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm"
                  value={draft.packageType}
                  onChange={(e) =>
                    setDraft({ ...draft, packageType: e.target.value })
                  }
                >
                  {PACKAGE_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={create}
              disabled={busy === "new" || !draft.slug || !draft.nameAr || draft.priceSar < 1}
            >
              {busy === "new" && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isAr ? "حفظ المنتج" : "Save product"}
            </Button>
          </CardContent>
        </Card>
      )}

      {grouped.map((g) => (
        <Card key={g.value}>
          <CardContent className="p-0">
            <div className="border-b border-hajr-border px-5 py-3 font-semibold">
              {isAr ? g.ar : g.en}
            </div>
            <div className="divide-y divide-hajr-border">
              {g.items.length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">
                  {isAr ? "لا توجد منتجات." : "No products."}
                </p>
              )}
              {g.items.map((p) => {
                const patch = edits[p.id] ?? {};
                const price = patch.priceSar ?? p.priceSar;
                const dirty = Object.keys(patch).length > 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-4"
                  >
                    <div className="min-w-[220px] flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {isAr ? p.nameAr : p.nameEn}
                        </span>
                        {!p.isActive && (
                          <Badge variant="warning">
                            {isAr ? "مخفي" : "Hidden"}
                          </Badge>
                        )}
                        {/* Click to change: it decides whether the buyer is
                            asked for the school year at checkout. */}
                        <button
                          type="button"
                          onClick={() => toggleGradeLevel(p)}
                          disabled={busy === p.id}
                          title={
                            isAr
                              ? "اضغط لتغيير: هل يُسأل المشتري عن الصف الدراسي؟"
                              : "Click to change: does checkout ask for the school year?"
                          }
                        >
                          <Badge variant={p.requiresGradeLevel ? "info" : "outline"}>
                            {p.requiresGradeLevel
                              ? isAr ? "يسأل عن الصف" : "Asks for year"
                              : isAr ? "بلا صف" : "No year"}
                          </Badge>
                        </button>
                      </div>
                      <div className="num text-xs text-muted-foreground" dir="ltr">
                        {p.slug}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        dir="ltr"
                        className="w-28"
                        value={String(price)}
                        onChange={(e) =>
                          setEdit(p.id, {
                            priceSar:
                              Number(e.target.value.replace(/[^\d.]/g, "")) || 0,
                          })
                        }
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {isAr ? p.unitAr : p.unitEn}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => save(p)}
                      disabled={!dirty || busy === p.id}
                    >
                      {busy === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(p)}
                      disabled={busy === p.id}
                      title={isAr ? "إظهار / إخفاء" : "Show / hide"}
                    >
                      {p.isActive ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
