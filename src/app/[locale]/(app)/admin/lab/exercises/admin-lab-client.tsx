"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Exercise {
  id: string;
  type: string;
  level: string;
  title: string;
  titleAr: string;
  isPublished: boolean;
  attempts: number;
}

const TYPES = ["SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY"];

export function AdminLabClient({
  exercises,
  stats,
}: {
  exercises: Exercise[];
  stats: { total: number; published: number; attempts: number };
}) {
  const t = useTranslations("Lab");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);

  const filtered = exercises.filter((e) => {
    if (q && !`${e.title} ${e.titleAr}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (statusFilter === "published" && !e.isPublished) return false;
    if (statusFilter === "draft" && e.isPublished) return false;
    return true;
  });

  async function togglePublish(ex: Exercise) {
    await fetch(`/api/teacher/lab/exercises/${ex.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !ex.isPublished }),
    });
    router.refresh();
  }

  async function doDelete(ex: Exercise) {
    await fetch(`/api/teacher/lab/exercises/${ex.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold num">{stats.total}</div>
            <div className="text-xs text-muted-foreground">{t("title")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold num">{stats.published}</div>
            <div className="text-xs text-muted-foreground">{t("published")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold num">{stats.attempts}</div>
            <div className="text-xs text-muted-foreground">{t("attempts")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("exerciseTitle")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border p-2 text-sm"
        >
          <option value="">{t("exerciseType")}</option>
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border p-2 text-sm"
        >
          <option value="">—</option>
          <option value="published">{t("published")}</option>
          <option value="draft">{t("draft")}</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("exerciseTitle")}</TableHead>
                <TableHead>{t("exerciseType")}</TableHead>
                <TableHead>{t("level")}</TableHead>
                <TableHead>{t("attempts")}</TableHead>
                <TableHead>{t("published")}</TableHead>
                <TableHead className="text-end">—</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-6 text-center text-muted-foreground">
                    {t("noExercises")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell>{isAr ? ex.titleAr : ex.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ex.type}</Badge>
                    </TableCell>
                    <TableCell className="num">{ex.level}</TableCell>
                    <TableCell className="num">{ex.attempts}</TableCell>
                    <TableCell>
                      <Badge variant={ex.isPublished ? "success" : "outline"}>
                        {ex.isPublished ? t("published") : t("draft")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePublish(ex)}
                        >
                          {ex.isPublished ? t("unpublish") : t("publish")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(ex)}
                        >
                          {t("delete")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (isAr ? deleteTarget.titleAr : deleteTarget.title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && doDelete(deleteTarget)}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
