"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Users, BookText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ClassFormDialog } from "./class-form-dialog";
import { deleteClassAction } from "../../_actions/classes";
import { fmtSAR, teacherColor } from "@/lib/format";

type Row = {
  id: string; name: string; nameAr: string | null;
  cohortCode: string; status: string;
  scheduleDays: string[]; timeSlot: string; durationMinutes: number;
  maxStudents: number; enrolled: number;
  genderRestriction: "MALE" | "FEMALE" | null;
  pricePerMonth: string;
  startDate: string; endDate: string | null;
  program: { id: string; code: string; name: string; nameAr: string };
  teacher: { id: string; name: string; nameAr: string | null; avatar: string | null };
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS_VARIANT: Record<string, "success" | "info" | "danger" | "warning"> = {
  ACTIVE: "success", DRAFT: "info", COMPLETED: "info", CANCELLED: "danger",
};

export function ClassesClient({
  rows, total, page, pageSize, programs, teachers,
}: {
  rows: Row[]; total: number; page: number; pageSize: number;
  programs: { id: string; code: string; nameEn: string; nameAr: string; defaultPriceSar: string }[];
  teachers: { id: string; name: string; nameAr: string | null }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
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

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Classes.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Common.showing")} <span className="num">{rows.length}</span> {t("Common.of")} <span className="num">{total}</span>
          </p>
        </div>
        <Button variant="cta" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="me-2 h-4 w-4" />{t("Classes.addNew")}
        </Button>
      </div>

      <Card className="p-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input defaultValue={sp.get("q") ?? ""} placeholder={t("Common.search")} className="ps-9" onChange={(e) => debouncedQ(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Classes.cohortCode")}</TableHead>
              <TableHead>{t("Common.name")}</TableHead>
              <TableHead>{t("Nav.programs")}</TableHead>
              <TableHead>{t("Classes.teacher")}</TableHead>
              <TableHead>{t("Classes.schedule")}</TableHead>
              <TableHead>{t("Classes.enrolled")}</TableHead>
              <TableHead>{t("Classes.pricePerMonth")}</TableHead>
              <TableHead>{t("Common.status")}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground p-12">{t("Classes.noClasses")}</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.cohortCode}</TableCell>
                <TableCell>
                  <Link href={`/admin/classes/${r.id}`} className="font-medium hover:text-brand-rose">
                    {locale === "ar" && r.nameAr ? r.nameAr : r.name}
                  </Link>
                </TableCell>
                <TableCell><Badge variant="info">{t("Programs." + r.program.code as any)}</Badge></TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {r.teacher.avatar ? (
                        <AvatarImage src={r.teacher.avatar} alt={r.teacher.name} />
                      ) : null}
                      <AvatarFallback
                        className="text-[10px] text-white"
                        style={{ backgroundColor: teacherColor(r.teacher.id) }}
                      >
                        {initials(r.teacher.name)}
                      </AvatarFallback>
                    </Avatar>
                    {locale === "ar" && r.teacher.nameAr ? r.teacher.nameAr : r.teacher.name}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  <div>{r.scheduleDays.map((d) => t("Days." + d as any)).join(" · ")}</div>
                  <div className="text-muted-foreground num">{r.timeSlot} · <span>{r.durationMinutes}m</span></div>
                </TableCell>
                <TableCell className="num">
                  {r.enrolled}/{r.maxStudents}
                  {r.genderRestriction && <Badge variant="rose" className="ms-1">{t("Common." + r.genderRestriction.toLowerCase() as any)}</Badge>}
                </TableCell>
                <TableCell className="num">{fmtSAR(r.pricePerMonth, locale as "ar" | "en")}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{t("ClassStatus." + r.status as any)}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/classes/${r.id}`)}>
                        <Users className="me-2 h-4 w-4" />{t("Classes.roster")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(r)}>
                        <Pencil className="me-2 h-4 w-4" />{t("Classes.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDel(r)}>
                        <Trash2 className="me-2 h-4 w-4" />{t("Classes.delete")}
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

      {showAdd && <ClassFormDialog mode="create" programs={programs} teachers={teachers} onClose={() => setShowAdd(false)} onDone={() => router.refresh()} />}
      {editing && <ClassFormDialog mode="edit" existing={editing} programs={programs} teachers={teachers} onClose={() => setEditing(null)} onDone={() => router.refresh()} />}

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
              const res = await deleteClassAction(confirmDel.id);
              if (res.ok) toast.success(t("Common.success"));
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
