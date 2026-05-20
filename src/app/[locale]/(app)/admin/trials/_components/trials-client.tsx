"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Phone,
  UserPlus,
  Calendar,
  CheckCircle2,
  XCircle,
  Mail,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { updateTrialStatus } from "../_actions/trial-actions";

type TrialStatus =
  | "NEW"
  | "CONTACTED"
  | "SCHEDULED"
  | "COMPLETED"
  | "CONVERTED"
  | "DECLINED";

type TrialRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  childGrade: string | null;
  preferredProgram: string | null;
  preferredTime: string | null;
  notes: string | null;
  source: string;
  status: TrialStatus;
  assignedTo: string | null;
  followUpAt: string | null;
  convertedToStudentId: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<
  TrialStatus,
  { variant: "info" | "warning" | "default" | "success" | "rose" | "danger"; label: string }
> = {
  NEW: { variant: "info", label: "جديد" },
  CONTACTED: { variant: "warning", label: "تم التواصل" },
  SCHEDULED: { variant: "default", label: "مجدول" },
  COMPLETED: { variant: "success", label: "مكتمل" },
  CONVERTED: { variant: "success", label: "تم التحويل" },
  DECLINED: { variant: "danger", label: "مرفوض" },
};

const STATUS_OPTIONS: TrialStatus[] = [
  "NEW",
  "CONTACTED",
  "SCHEDULED",
  "COMPLETED",
  "CONVERTED",
  "DECLINED",
];

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function TrialsClient({ rows }: { rows: TrialRow[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const statusCounts = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  async function handleStatusChange(id: string, newStatus: TrialStatus) {
    setUpdatingId(id);
    const res = await updateTrialStatus(id, newStatus);
    if (res.ok) {
      toast.success(t("Common.success"));
      startTransition(() => router.refresh());
    } else {
      toast.error(res.error);
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Trials.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Common.showing")}{" "}
            <span className="num">{filtered.length}</span> {t("Common.of")}{" "}
            <span className="num">{rows.length}</span> {t("Common.results")}
          </p>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_OPTIONS.map((s) => (
          <Card
            key={s}
            className={`cursor-pointer p-3 text-center transition-shadow hover:shadow-md ${
              statusFilter === s ? "ring-2 ring-brand-navy" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === s ? "ALL" : s)}
          >
            <div className="text-2xl font-bold num">
              {(statusCounts[s] ?? 0).toLocaleString()}
            </div>
            <Badge variant={STATUS_CONFIG[s].variant} className="mt-1">
              {STATUS_CONFIG[s].label}
            </Badge>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Trials.searchPlaceholder")}
              className="ps-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("Common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("Common.all")}</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || statusFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              {t("Common.cancel")}
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isPending ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">{t("Trials.noTrials")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Common.name")}</TableHead>
                <TableHead>{t("Common.phone")}</TableHead>
                <TableHead>{t("Trials.program")}</TableHead>
                <TableHead>{t("Trials.grade")}</TableHead>
                <TableHead>{t("Common.status")}</TableHead>
                <TableHead>{t("Trials.source")}</TableHead>
                <TableHead>{t("Common.created")}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{r.name}</div>
                      {r.email && (
                        <div className="text-xs text-muted-foreground">
                          {r.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="num text-sm">{r.phone}</TableCell>
                  <TableCell className="text-sm">
                    {r.preferredProgram ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.childGrade ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[r.status].variant}>
                      {STATUS_CONFIG[r.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground num">
                    {formatDate(r.createdAt, locale)}
                  </TableCell>
                  <TableCell>
                    {updatingId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status !== "CONTACTED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(r.id, "CONTACTED")
                              }
                            >
                              <Phone className="me-2 h-4 w-4" />
                              {t("Trials.markContacted")}
                            </DropdownMenuItem>
                          )}
                          {r.status !== "SCHEDULED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(r.id, "SCHEDULED")
                              }
                            >
                              <Calendar className="me-2 h-4 w-4" />
                              {t("Trials.scheduleTrial")}
                            </DropdownMenuItem>
                          )}
                          {r.status !== "COMPLETED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(r.id, "COMPLETED")
                              }
                            >
                              <CheckCircle2 className="me-2 h-4 w-4" />
                              {t("Trials.markCompleted")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {r.status !== "CONVERTED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(r.id, "CONVERTED")
                              }
                            >
                              <UserPlus className="me-2 h-4 w-4" />
                              {t("Trials.convertToStudent")}
                            </DropdownMenuItem>
                          )}
                          {r.status !== "DECLINED" && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                handleStatusChange(r.id, "DECLINED")
                              }
                            >
                              <XCircle className="me-2 h-4 w-4" />
                              {t("Trials.decline")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
