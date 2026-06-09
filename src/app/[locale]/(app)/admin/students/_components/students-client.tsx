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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentFormDialog } from "./student-form-dialog";
import {
  deleteStudentAction, toggleStudentActiveAction, bulkImportStudentsAction,
  getStudentPreviewAction,
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
    subscriptionDate?: string | null;
    importantNotes?: string | null;
    studentPhone?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    residenceAddress?: string | null;
    englishTeacherName?: string | null;
    promoCode?: string | null;
    profileId?: string | null;
  } | null;
};

type PreviewData = {
  id: string;
  name: string | null;
  nameAr: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gradeLevel: string | null;
  englishLevel: string | null;
  gender: string | null;
  schoolName: string | null;
  schoolNameAr: string | null;
  learningGoals: string | null;
  activePackage: string | null;
  packageStartedAt: string | null;
  packageExpiresAt: string | null;
  subscriptionDate: string | null;
  importantNotes: string | null;
  studentPhone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  residenceAddress: string | null;
  englishTeacherName: string | null;
  promoCode: string | null;
  evaluations: {
    id: string;
    skillLevel: string;
    participation: number;
    improvement: "IMPROVED" | "SAME" | "DECLINED";
    note: string | null;
    createdAt: string;
    teacherName: string;
    teacherNameAr: string | null;
    className: string | null;
    classNameAr: string | null;
  }[];
  invoices: {
    invoiceNumber: string;
    month: number;
    year: number;
    totalSar: string;
    status: string;
    invoiceStatus: string;
    issuedAt: string | null;
    dueDate: string | null;
    paidAt: string | null;
  }[];
};

const LEVEL_VARIANT: Record<string, "success" | "info" | "rose"> = {
  BEGINNER: "info",
  INTERMEDIATE: "success",
  ADVANCED: "rose",
};

/**
 * Full years from birthDate (ISO string) to today, or null when no/invalid date.
 * Decrements if this year's birthday hasn't occurred yet.
 */
function computeAge(birthIso: string | null | undefined): number | null {
  if (!birthIso) return null;
  const b = new Date(birthIso);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 ? age : null;
}

export function StudentsClient({
  rows,
  total,
  page,
  pageSize,
  schools,
  gradeOptions = [],
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  schools: { id: string; name: string }[];
  gradeOptions?: string[];
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
  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function openPreview(row: Row) {
    setPreviewRow(row);
    setPreviewData(null);
    setPreviewError(null);
    const profileId = row.profile?.profileId;
    if (!profileId) {
      setPreviewError("NOT_FOUND");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await getStudentPreviewAction(profileId);
      if (res.ok) setPreviewData(res.data as PreviewData);
      else setPreviewError(res.error);
    } catch (e: any) {
      setPreviewError(e?.message ?? "ERROR");
    } finally {
      setPreviewLoading(false);
    }
  }

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
          {gradeOptions.length > 0 && (
            <FilterChip label={t("Students.gradeFilter")} param="grade" current={sp.get("grade")} options={
              gradeOptions.map((g) => ({ v: g, l: g }))
            } onChange={(v) => updateFilter("grade", v)} />
          )}
          <FilterChip label={t("Students.ageFilter")} param="age" current={sp.get("age")} options={[
            { v: "6-9", l: t("Students.age6to9") },
            { v: "10-12", l: t("Students.age10to12") },
            { v: "13-15", l: t("Students.age13to15") },
            { v: "16-18", l: t("Students.age16to18") },
            { v: "18+", l: t("Students.age18plus") },
          ]} onChange={(v) => updateFilter("age", v)} />

          {(sp.get("q") || sp.get("level") || sp.get("gender") || sp.get("package") || sp.get("grade") || sp.get("age")) && (
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
                <TableHead>{t("Students.colAge")}</TableHead>
                <TableHead>{t("Common.package")}</TableHead>
                <TableHead>{t("Students.promoCode")}</TableHead>
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
                  <TableCell className="num">{computeAge(r.profile?.birthDate) ?? "—"}</TableCell>
                  <TableCell>
                    {r.profile?.activePackage ? <Badge variant="info">{t("Packages." + r.profile.activePackage as any)}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    {r.profile?.promoCode ? (
                      <Badge variant="outline" className="num font-mono">{r.profile.promoCode}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
                        <DropdownMenuItem onClick={() => openPreview(r)}>
                          <Eye className="me-2 h-4 w-4" />{t("Students.preview")}
                        </DropdownMenuItem>
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

      <Dialog open={!!previewRow} onOpenChange={(o) => { if (!o) { setPreviewRow(null); setPreviewData(null); setPreviewError(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Students.previewTitle")}</DialogTitle>
            <DialogDescription>
              {previewRow ? (locale === "ar" && previewRow.nameAr ? previewRow.nameAr : previewRow.name) : ""}
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : previewError ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("Common.error")}</div>
          ) : previewData ? (
            <div className="space-y-5 py-2 text-sm">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Students.subscription")}</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <PreviewRow label={t("Students.subscriptionDate")} value={fmtDate(previewData.subscriptionDate)} />
                  <PreviewRow label={t("Common.package")} value={previewData.activePackage ? t(("Packages." + previewData.activePackage) as any) : null} />
                  <PreviewRow label={t("Students.packageStartedAt")} value={fmtDate(previewData.packageStartedAt)} />
                  <PreviewRow label={t("Students.packageExpiresAt")} value={fmtDate(previewData.packageExpiresAt)} />
                  <PreviewRow label={t("Students.promoCode")} value={previewData.promoCode} />
                </dl>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Students.title")}</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <PreviewRow label={t("Common.email")} value={previewData.email} />
                  <PreviewRow label={t("Common.phone")} value={previewData.phone} />
                  <PreviewRow label={t("Students.studentPhone")} value={previewData.studentPhone} />
                  <PreviewRow label={t("Students.birthDate")} value={fmtDate(previewData.birthDate)} />
                  <PreviewRow label={t("Students.colAge")} value={ageLabel(previewData.birthDate)} />
                  <PreviewRow label={t("Students.gradeLevel")} value={previewData.gradeLevel} />
                  <PreviewRow label={t("Common.level")} value={previewData.englishLevel ? t(("Levels." + previewData.englishLevel) as any) : null} />
                  <PreviewRow label={t("Common.gender")} value={previewData.gender ? t(("Common." + previewData.gender.toLowerCase()) as any) : null} />
                  <PreviewRow label={t("Common.school")} value={locale === "ar" && previewData.schoolNameAr ? previewData.schoolNameAr : previewData.schoolName} />
                  <PreviewRow label={t("Students.englishTeacherName")} value={previewData.englishTeacherName} />
                </dl>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Students.residence")}</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <PreviewRow label={t("Students.guardianName")} value={previewData.guardianName} />
                  <PreviewRow label={t("Students.guardianPhone")} value={previewData.guardianPhone} />
                  <div className="sm:col-span-2">
                    <PreviewRow label={t("Students.residenceAddress")} value={previewData.residenceAddress} />
                  </div>
                  <div className="sm:col-span-2">
                    <PreviewRow label={t("Students.learningGoals")} value={previewData.learningGoals} />
                  </div>
                  <div className="sm:col-span-2">
                    <PreviewRow label={t("Students.importantNotes")} value={previewData.importantNotes} />
                  </div>
                </dl>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Students.monthlyPayments")}</h3>
                {previewData.invoices.length === 0 ? (
                  <p className="text-muted-foreground">{t("Students.noPayments")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Students.subscriptionDate")}</TableHead>
                        <TableHead>{t("Students.amount")}</TableHead>
                        <TableHead>{t("Common.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.invoices.map((inv) => {
                        const isPaid = inv.invoiceStatus === "PAID" || inv.status === "PAID";
                        return (
                          <TableRow key={inv.invoiceNumber}>
                            <TableCell className="num">{String(inv.month).padStart(2, "0")}/{inv.year}</TableCell>
                            <TableCell className="num">{inv.totalSar} {t("Students.sar")}</TableCell>
                            <TableCell>
                              <Badge variant={isPaid ? "success" : "danger"}>
                                {isPaid ? t("Students.paid") : t("Students.unpaid")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </section>

              {/* Teacher evaluations (F3) */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Evaluation.adminSectionTitle")}</h3>
                {previewData.evaluations.length === 0 ? (
                  <p className="text-muted-foreground">{t("Evaluation.none")}</p>
                ) : (
                  <ul className="space-y-2">
                    {previewData.evaluations.map((e) => (
                      <li key={e.id} className="rounded-md border bg-muted/30 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="info">{e.skillLevel}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {t("Evaluation.participation")}: <span className="num font-medium">{e.participation}/5</span>
                          </span>
                          <Badge variant={e.improvement === "IMPROVED" ? "success" : e.improvement === "DECLINED" ? "danger" : "outline"}>
                            {t(("Evaluation.imp_" + e.improvement) as any)}
                          </Badge>
                          <span className="ms-auto num text-xs text-muted-foreground">{fmtDate(e.createdAt)}</span>
                        </div>
                        {e.note && <p className="mt-2 text-sm">{e.note}</p>}
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {t("Evaluation.by")} {locale === "ar" && e.teacherNameAr ? e.teacherNameAr : e.teacherName}
                          {e.className ? ` · ${locale === "ar" && e.classNameAr ? e.classNameAr : e.className}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("Common.noData")}</div>
          )}
        </DialogContent>
      </Dialog>

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

function fmtDate(v: string | null): string | null {
  return v ? v.slice(0, 10) : null;
}

// Derived age as a Western-digit string for the preview (null → "—" via PreviewRow).
// String(number) is always ASCII 0-9, so this is locale-safe.
function ageLabel(birthIso: string | null): string | null {
  const a = computeAge(birthIso);
  return a === null ? null : String(a);
}

function PreviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value && value.length ? value : "—"}</dd>
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
          {label}{sel.length > 0 && <span className="ms-1 rounded-full bg-hajr-deep-navy px-1.5 text-xs text-white num">{sel.length}</span>}
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
