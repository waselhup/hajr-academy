"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Plus, Search, Download, Upload, MoreHorizontal, Trash2, Eye, Pencil,
  Power, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentFormDialog } from "./student-form-dialog";
import {
  deleteStudentAction, toggleStudentActiveAction, bulkImportStudentsAction,
} from "../../_actions/students";

type Row = {
  id: string;
  name: string;
  nameAr: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  profile: {
    englishLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
    gender: "MALE" | "FEMALE" | null;
    schoolName: string | null;
    schoolId: string | null;
    activePackage: string | null;
    gradeLevel?: string | null;
    birthDate?: string | null;
    packageStartedAt?: string | null;
    packageExpiresAt?: string | null;
  } | null;
};

const LEVEL_VARIANT: Record<string, "success" | "info" | "rose"> = {
  BEGINNER: "info",
  INTERMEDIATE: "success",
  ADVANCED: "rose",
};

export function StudentsClient({
  rows,
  total,
  page,
  pageSize,
  schools,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  schools: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const q = sp.get("q") ?? "";

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateFilter(key: string, value: string | null) {
    startTransition(() => pushParam(key, value));
  }

  let searchTimer: any;
  function onSearchChange(value: string) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => updateFilter("q", value || null), 300);
  }

  const selectedIds = Object.entries(selection).filter(([_, v]) => v).map(([k]) => k);

  function exportCsv(rowsToExport: Row[]) {
    const data = rowsToExport.map((r) => ({
      name: r.name,
      nameAr: r.nameAr ?? "",
      email: r.email,
      phone: r.phone ?? "",
      gender: r.profile?.gender ?? "",
      englishLevel: r.profile?.englishLevel ?? "",
      activePackage: r.profile?.activePackage ?? "",
      isActive: r.isActive ? "Y" : "N",
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function onImport(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = (results.data as any[]).slice(0, 500);
        const res = await bulkImportStudentsAction({ rows: rows as any });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(t("Students.imported", { n: res.data.imported }));
        if (res.data.failed > 0) toast.warning(t("Students.importFailed", { n: res.data.failed }));
        router.refresh();
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Students.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Common.showing")} <span className="num">{rows.length}</span> {t("Common.of")} <span className="num">{total}</span> {t("Common.results")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
            />
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="me-2 h-4 w-4" />{t("Common.importCsv")}</span>
            </Button>
          </label>
          <Button variant="outline" size="sm" onClick={() => exportCsv(rows)}>
            <Download className="me-2 h-4 w-4" />{t("Common.exportCsv")}
          </Button>
          <Button variant="cta" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="me-2 h-4 w-4" />{t("Students.addNew")}
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              defaultValue={q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("Students.filterPlaceholder")}
              className="ps-9"
            />
          </div>
          <FilterChip label={t("Common.level")} param="level" current={sp.get("level")} options={[
            { v: "BEGINNER", l: t("Levels.BEGINNER") },
            { v: "INTERMEDIATE", l: t("Levels.INTERMEDIATE") },
            { v: "ADVANCED", l: t("Levels.ADVANCED") },
          ]} onChange={(v) => updateFilter("level", v)} />
          <FilterChip label={t("Common.gender")} param="gender" current={sp.get("gender")} options={[
            { v: "MALE", l: t("Common.male") }, { v: "FEMALE", l: t("Common.female") },
          ]} onChange={(v) => updateFilter("gender", v)} />
          <FilterChip label={t("Common.package")} param="package" current={sp.get("package")} options={[
            { v: "ESSENTIAL", l: t("Packages.ESSENTIAL") },
            { v: "INTEGRATED", l: t("Packages.INTEGRATED") },
            { v: "PRIVATE", l: t("Packages.PRIVATE") },
            { v: "SCHOOL", l: t("Packages.SCHOOL") },
          ]} onChange={(v) => updateFilter("package", v)} />

          {(sp.get("q") || sp.get("level") || sp.get("gender") || sp.get("package")) && (
            <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
              {t("Common.cancel")}
            </Button>
          )}
        </div>
      </Card>

      {selectedIds.length > 0 && (
        <Card className="flex items-center justify-between border-brand-rose p-3">
          <div className="text-sm">
            <span className="font-medium num">{selectedIds.length}</span> {t("Common.students")}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCsv(rows.filter((r) => selection[r.id]))}>
              <Download className="me-2 h-4 w-4" />{t("Common.exportCsv")}
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isPending ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">{t("Students.noStudents")}</p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="me-2 h-4 w-4" />{t("Students.addNew")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={rows.length > 0 && rows.every((r) => selection[r.id])}
                    onCheckedChange={(c) => {
                      const next: Record<string, boolean> = {};
                      if (c) rows.forEach((r) => (next[r.id] = true));
                      setSelection(next);
                    }}
                  />
                </TableHead>
                <TableHead>{t("Common.name")}</TableHead>
                <TableHead>{t("Common.email")}</TableHead>
                <TableHead>{t("Common.level")}</TableHead>
                <TableHead>{t("Common.gender")}</TableHead>
                <TableHead>{t("Common.package")}</TableHead>
                <TableHead>{t("Common.status")}</TableHead>
                <TableHead>{t("Common.created")}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-state={selection[r.id] ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={!!selection[r.id]}
                      onCheckedChange={(c) => setSelection((s) => ({ ...s, [r.id]: !!c }))}
                    />
                  </TableCell>
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
                    {r.profile?.englishLevel ? (
                      <Badge variant={LEVEL_VARIANT[r.profile.englishLevel]}>{t("Levels." + r.profile.englishLevel as any)}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{r.profile?.gender ? t("Common." + r.profile.gender.toLowerCase() as any) : "—"}</TableCell>
                  <TableCell>
                    {r.profile?.activePackage ? <Badge variant="info">{t("Packages." + r.profile.activePackage as any)}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "success" : "danger"}>{r.isActive ? t("Common.active") : t("Common.inactive")}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground num">{r.createdAt.slice(0, 10)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(r)}>
                          <Pencil className="me-2 h-4 w-4" />{t("Students.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          const res = await toggleStudentActiveAction(r.id);
                          if (res.ok) toast.success(t("Common.success"));
                          else toast.error(res.error);
                          router.refresh();
                        }}>
                          <Power className="me-2 h-4 w-4" />{r.isActive ? t("Common.bulkDeactivate") : t("Common.bulkActivate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDelete(r)}>
                          <Trash2 className="me-2 h-4 w-4" />{t("Students.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t("Common.page")} <span className="num">{page}</span> {t("Common.of")} <span className="num">{pages}</span>
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => pushParam("page", String(page - 1))}>
            {t("Common.previous")}
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => pushParam("page", String(page + 1))}>
            {t("Common.next")}
          </Button>
        </div>
      </div>

      {showAddDialog && (
        <StudentFormDialog mode="create" schools={schools} onClose={() => setShowAddDialog(false)} onDone={() => router.refresh()} />
      )}
      {editing && (
        <StudentFormDialog mode="edit" existing={editing} schools={schools} onClose={() => setEditing(null)} onDone={() => router.refresh()} />
      )}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Common.confirmDeleteMsg")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                const res = await deleteStudentAction(confirmDelete.id);
                if (res.ok) toast.success(t("Students.deleteSuccess"));
                else toast.error(res.error);
                setConfirmDelete(null);
                router.refresh();
              }}
            >
              {t("Common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  label, current, options, onChange,
}: {
  label: string; param: string; current: string | null;
  options: { v: string; l: string }[]; onChange: (v: string | null) => void;
}) {
  const sel = (current ?? "").split(",").filter(Boolean);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={sel.length ? "secondary" : "outline"} size="sm">
          {label}{sel.length > 0 && <span className="ms-1 rounded-full bg-brand-rose px-1.5 text-xs text-white num">{sel.length}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((o) => {
          const isOn = sel.includes(o.v);
          return (
            <DropdownMenuItem
              key={o.v}
              onClick={(e) => {
                e.preventDefault();
                const next = isOn ? sel.filter((s) => s !== o.v) : [...sel, o.v];
                onChange(next.length ? next.join(",") : null);
              }}
            >
              <Checkbox checked={isOn} className="me-2 pointer-events-none" />
              {o.l}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
