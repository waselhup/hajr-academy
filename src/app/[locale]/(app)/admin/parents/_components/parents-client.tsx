"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Plus, MoreHorizontal, Pencil, Trash2, Copy, RefreshCw, Link as LinkIcon, Search, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ParentFormDialog } from "./parent-form-dialog";
import { ParentDetailSheet } from "./parent-detail-sheet";
import { deleteParentAction, regenerateInviteCodeAction } from "../../_actions/parents";

type Row = {
  id: string;
  name: string;
  nameAr: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  profile: {
    id: string;
    occupation: string | null;
    inviteCode: string;
    childCount: number;
    childLinks: { id: string; studentId: string; studentName: string; studentNameAr: string | null; relation: string; isPrimary: boolean; canPay: boolean }[];
  } | null;
};

export function ParentsClient({
  rows, total, page, pageSize, students,
}: {
  rows: Row[]; total: number; page: number; pageSize: number;
  students: { id: string; name: string; nameAr: string | null }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);
  const [openDetail, setOpenDetail] = useState<Row | null>(null);

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

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success(t("Common.copied"));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Parents.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Common.showing")} <span className="num">{rows.length}</span> {t("Common.of")} <span className="num">{total}</span>
          </p>
        </div>
        <Button variant="cta" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="me-2 h-4 w-4" />{t("Parents.addNew")}
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
              <TableHead>{t("Common.name")}</TableHead>
              <TableHead>{t("Common.email")}</TableHead>
              <TableHead>{t("Common.phone")}</TableHead>
              <TableHead>{t("Parents.linkedChildren")}</TableHead>
              <TableHead>{t("Parents.inviteCode")}</TableHead>
              <TableHead>{t("Common.status")}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-12">{t("Common.noResults")}</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarFallback>{r.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                    <div>
                      <div className="font-medium">{locale === "ar" && r.nameAr ? r.nameAr : r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.profile?.occupation ?? "—"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{r.email}</TableCell>
                <TableCell className="num">{r.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="info" className="num">{r.profile?.childCount ?? 0}</Badge>
                </TableCell>
                <TableCell>
                  <button
                    className="inline-flex items-center gap-1 rounded bg-hajr-hover/40 px-2 py-1 font-mono text-xs hover:bg-hajr-hover/60"
                    onClick={() => r.profile && copyCode(r.profile.inviteCode)}
                  >
                    {r.profile?.inviteCode}<Copy className="h-3 w-3" />
                  </button>
                </TableCell>
                <TableCell><Badge variant={r.isActive ? "success" : "danger"}>{r.isActive ? t("Common.active") : t("Common.inactive")}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setOpenDetail(r)}>
                        <Users className="me-2 h-4 w-4" />{t("Parents.linkedChildren")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(r)}>
                        <Pencil className="me-2 h-4 w-4" />{t("Parents.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        if (!r.profile) return;
                        const res = await regenerateInviteCodeAction(r.profile.id);
                        if (res.ok) toast.success(`${t("Parents.regenerateCode")}: ${res.data.code}`);
                        else toast.error(res.error);
                        router.refresh();
                      }}>
                        <RefreshCw className="me-2 h-4 w-4" />{t("Parents.regenerateCode")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDel(r)}>
                        <Trash2 className="me-2 h-4 w-4" />{t("Parents.delete")}
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

      {showAdd && <ParentFormDialog mode="create" onClose={() => setShowAdd(false)} onDone={() => router.refresh()} />}
      {editing && <ParentFormDialog mode="edit" existing={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />}
      {openDetail && <ParentDetailSheet parent={openDetail} students={students} onClose={() => setOpenDetail(null)} onDone={() => router.refresh()} />}

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
              const res = await deleteParentAction(confirmDel.id);
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
