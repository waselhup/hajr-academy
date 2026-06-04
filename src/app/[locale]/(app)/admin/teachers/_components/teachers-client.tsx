"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Power, Trash2, Search, Star, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { TeacherFormDialog } from "./teacher-form-dialog";
import { deleteTeacherAction, toggleTeacherActiveAction } from "../../_actions/teachers";
import { fmtSAR, fmtUSD } from "@/lib/format";

const SPEC_VALUES = ["STEP", "IELTS", "UNIVERSITY_PREP", "GENERAL", "BUSINESS"] as const;

type Row = {
  id: string; name: string; nameAr: string | null; email: string; phone: string | null;
  isActive: boolean; createdAt: string;
  profile: {
    id?: string;
    bio: string | null;
    specializations: string[];
    salaryBase: string;
    hourlyRate?: string;
    salaryBaseUsd?: string | null;
    hourlyRateUsd?: string | null;
    zoomHostEmail: string | null;
    ageGroup: string | null;
    availabilityDays: string[];
    availabilityHours: string | null;
    rating: string | null;
    totalStudents: number;
    classCount: number;
  } | null;
};

export function TeachersClient({ rows, total, page, pageSize }: { rows: Row[]; total: number; page: number; pageSize: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [previewing, setPreviewing] = useState<Row | null>(null);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  let timer: any;
  function debouncedQ(v: string) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const p = new URLSearchParams(sp.toString());
      if (v) p.set("q", v); else p.delete("q");
      p.delete("page");
      router.push(`${pathname}?${p.toString()}`);
    }, 300);
  }

  const activeSpec = sp.get("spec");
  function setSpec(v: string | null) {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set("spec", v); else p.delete("spec");
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Teachers.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Common.showing")} <span className="num">{rows.length}</span> {t("Common.of")} <span className="num">{total}</span>
          </p>
        </div>
        <Button variant="cta" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="me-2 h-4 w-4" />{t("Teachers.addNew")}
        </Button>
      </div>

      <Card className="space-y-3 p-3">
        <div className="relative w-64 max-w-full">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input defaultValue={sp.get("q") ?? ""} placeholder={t("Common.search")} className="ps-9" onChange={(e) => debouncedQ(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">{t("Teachers.filterBySpec")}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSpec(null)}
              aria-pressed={!activeSpec}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${!activeSpec ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
            >
              {t("Teachers.spec_ALL")}
            </button>
            {SPEC_VALUES.map((s) => {
              const active = activeSpec === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpec(active ? null : s)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {t(("Teachers.spec_" + s) as any)}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Common.name")}</TableHead>
              <TableHead>{t("Common.email")}</TableHead>
              <TableHead>{t("Teachers.specializations")}</TableHead>
              <TableHead>{t("Teachers.salaryBase")}</TableHead>
              <TableHead>{t("TeacherPay.currentRate")}</TableHead>
              <TableHead>{t("Teachers.rating")}</TableHead>
              <TableHead>{t("Nav.classes")}</TableHead>
              <TableHead>{t("Common.status")}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground p-12">{t("Common.noResults")}</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{r.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{locale === "ar" && r.nameAr ? r.nameAr : r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{r.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {r.profile?.specializations.map((s) => <Badge key={s} variant="info">{s}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="num">
                  {r.profile ? fmtSAR(r.profile.salaryBase, locale as "ar" | "en") : "—"}
                  {r.profile?.salaryBaseUsd ? <span className="block text-xs text-muted-foreground">{fmtUSD(r.profile.salaryBaseUsd, locale as "ar" | "en")}</span> : null}
                </TableCell>
                <TableCell className="num">
                  {r.profile?.hourlyRate ? fmtSAR(r.profile.hourlyRate, locale as "ar" | "en") : "—"}
                  {r.profile?.hourlyRateUsd ? <span className="block text-xs text-muted-foreground">{fmtUSD(r.profile.hourlyRateUsd, locale as "ar" | "en")}</span> : null}
                </TableCell>
                <TableCell>
                  {r.profile?.rating ? (
                    <span className="inline-flex items-center gap-1 num">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{r.profile.rating}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className="num">{r.profile?.classCount ?? 0}</TableCell>
                <TableCell><Badge variant={r.isActive ? "success" : "danger"}>{r.isActive ? t("Common.active") : t("Common.inactive")}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewing(r)}>
                        <Eye className="me-2 h-4 w-4" />{t("Teachers.preview")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(r)}>
                        <Pencil className="me-2 h-4 w-4" />{t("Teachers.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        const res = await toggleTeacherActiveAction(r.id);
                        if (res.ok) toast.success(t("Common.success"));
                        else toast.error(res.error);
                        router.refresh();
                      }}>
                        <Power className="me-2 h-4 w-4" />{r.isActive ? t("Common.bulkDeactivate") : t("Common.bulkActivate")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDel(r)}>
                        <Trash2 className="me-2 h-4 w-4" />{t("Teachers.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{t("Common.page")} <span className="num">{page}</span> {t("Common.of")} <span className="num">{pages}</span></span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { const p = new URLSearchParams(sp.toString()); p.set("page", String(page - 1)); router.push(`${pathname}?${p.toString()}`); }}>
            {t("Common.previous")}
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => { const p = new URLSearchParams(sp.toString()); p.set("page", String(page + 1)); router.push(`${pathname}?${p.toString()}`); }}>
            {t("Common.next")}
          </Button>
        </div>
      </div>

      {showAdd && <TeacherFormDialog mode="create" onClose={() => setShowAdd(false)} onDone={() => router.refresh()} />}
      {editing && <TeacherFormDialog mode="edit" existing={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />}
      {previewing && <TeacherPreviewDialog row={previewing} onClose={() => setPreviewing(null)} />}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Common.confirmDeleteMsg")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!confirmDel) return;
              const res = await deleteTeacherAction(confirmDel.id);
              if (res.ok) toast.success(t("Teachers.deleteSuccess"));
              else toast.error(res.error);
              setConfirmDel(null);
              router.refresh();
            }}>{t("Common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeacherPreviewDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const p = row.profile;
  const name = locale === "ar" && row.nameAr ? row.nameAr : row.name;
  const ageGroupLabel = p?.ageGroup ? t(("Teachers.ageGroup_" + p.ageGroup) as any) : "—";
  const days = p?.availabilityDays ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Teachers.previewTitle")}</DialogTitle>
          <DialogDescription>{name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{row.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{row.phone ?? "—"}</div>
            </div>
            <Badge variant={row.isActive ? "success" : "danger"} className="ms-auto">
              {row.isActive ? t("Common.active") : t("Common.inactive")}
            </Badge>
          </div>

          <Row2 label={t("Common.email")}><span dir="ltr">{row.email}</span></Row2>

          <Row2 label={t("Teachers.specializations")}>
            {p && p.specializations.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {p.specializations.map((s) => <Badge key={s} variant="info">{s}</Badge>)}
              </div>
            ) : "—"}
          </Row2>

          <div className="grid grid-cols-2 gap-3">
            <Row2 label={t("Teachers.salaryBase")}>
              <span className="num">{p ? fmtSAR(p.salaryBase, locale as "ar" | "en") : "—"}</span>
              {p?.salaryBaseUsd ? <span className="block text-xs text-muted-foreground num">{fmtUSD(p.salaryBaseUsd, locale as "ar" | "en")}</span> : null}
            </Row2>
            <Row2 label={t("AdminPay.rateLabel")}>
              <span className="num">{p?.hourlyRate ? fmtSAR(p.hourlyRate, locale as "ar" | "en") : "—"}</span>
              {p?.hourlyRateUsd ? <span className="block text-xs text-muted-foreground num">{fmtUSD(p.hourlyRateUsd, locale as "ar" | "en")}</span> : null}
            </Row2>
            <Row2 label={t("Teachers.rating")}>
              {p?.rating ? (
                <span className="inline-flex items-center gap-1 num">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.rating}
                </span>
              ) : "—"}
            </Row2>
            <Row2 label={t("Teachers.ageGroup")}>{ageGroupLabel}</Row2>
          </div>

          <Row2 label={t("Teachers.availabilityDays")}>
            {days.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {days.map((d) => <Badge key={d} variant="outline">{t(("Days." + d) as any)}</Badge>)}
              </div>
            ) : "—"}
          </Row2>

          <Row2 label={t("Teachers.availabilityHours")}>
            <span dir="ltr">{p?.availabilityHours || "—"}</span>
          </Row2>

          <Row2 label={t("Teachers.bio")}>
            <p className="whitespace-pre-wrap text-muted-foreground">{p?.bio || "—"}</p>
          </Row2>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
