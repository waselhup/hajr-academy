"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Copy, UserPlus, Loader2 } from "lucide-react";

interface InviteRow {
  id: string;
  inviteCode: string;
  studentName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}
interface StudentOption {
  id: string;
  name: string;
}

export function AdminParentInvitesClient({
  invites,
  students,
}: {
  invites: InviteRow[];
  students: StudentOption[];
}) {
  const t = useTranslations("ParentPortal");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const date = (s: string) => new Date(s).toISOString().slice(0, 10);

  async function generate() {
    if (!studentId) {
      toast.error(isAr ? "اختر طالباً" : "Select a student");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/parent-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(
          isAr ? `تم إنشاء الرمز: ${json.code}` : `Code created: ${json.code}`
        );
        setStudentId("");
        router.refresh();
      } else {
        toast.error(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(
      () => toast.success(isAr ? "تم نسخ الرمز" : "Code copied"),
      () => toast.error(isAr ? "تعذّر النسخ" : "Copy failed")
    );
  }

  function statusVariant(s: string): "success" | "warning" | "danger" | "outline" {
    if (s === "ACCEPTED") return "success";
    if (s === "PENDING") return "warning";
    if (s === "EXPIRED" || s === "REVOKED") return "danger";
    return "outline";
  }

  return (
    <div className="space-y-4">
      {/* Generate */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              {t("selectStudent")}
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-md border p-2 text-sm"
            >
              <option value="">—</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={generate} disabled={busy}>
            {busy ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="me-2 h-4 w-4" />
            )}
            {t("generateInvite")}
          </Button>
        </CardContent>
      </Card>

      {/* Invite list */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("inviteCode")}</TableHead>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("expires")}</TableHead>
                <TableHead className="text-end">—</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noInvites")}
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <code className="num font-mono text-base font-bold tracking-wider">
                        {inv.inviteCode}
                      </code>
                    </TableCell>
                    <TableCell>{inv.studentName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="num">{date(inv.expiresAt)}</TableCell>
                    <TableCell className="text-end">
                      {inv.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyCode(inv.inviteCode)}
                        >
                          <Copy className="me-1.5 h-3.5 w-3.5" />
                          {t("copy")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
