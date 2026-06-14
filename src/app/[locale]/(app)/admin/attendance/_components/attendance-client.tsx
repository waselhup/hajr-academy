"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Search, ArrowUp, ArrowDown, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateField } from "@/components/ui/western-fields";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export type AttendanceRow = {
  studentId: string;
  name: string;
  nameAr: string | null;
  avatar: string | null;
  className: string | null;
  classNameAr: string | null;
  classes: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  rate: number | null;
};

type Kpi = {
  sessions: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  totalMarked: number;
  rate: number | null;
};

function rateColor(r: number | null): string {
  if (r == null) return "text-muted-foreground";
  if (r >= 85) return "text-emerald-600";
  if (r >= 70) return "text-amber-600";
  return "text-red-600";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AttendanceClient({
  rows,
  total,
  page,
  pageSize,
  kpi,
  classOptions,
  filters,
}: {
  rows: AttendanceRow[];
  total: number;
  page: number;
  pageSize: number;
  kpi: Kpi;
  classOptions: { id: string; name: string; nameAr: string | null }[];
  filters: { q: string; classId: string; from: string; to: string; sort: string; dir: string };
}) {
  const t = useTranslations("AdminAttendance");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  let searchTimer: ReturnType<typeof setTimeout>;
  function onSearchChange(value: string) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => pushParam("q", value || null), 300);
  }

  function toggleSort(field: "name" | "rate") {
    if (filters.sort === field) {
      pushParam("dir", filters.dir === "asc" ? "desc" : "asc");
    } else {
      pushParam("sort", field);
      // default direction per field: name A→Z, rate low→high (worst first)
      const params = new URLSearchParams(sp.toString());
      params.set("sort", field);
      params.set("dir", "asc");
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }
  }

  function SortIcon({ field }: { field: "name" | "rate" }) {
    if (filters.sort !== field) return null;
    return filters.dir === "asc" ? (
      <ArrowUp className="ms-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ms-1 inline h-3 w-3" />
    );
  }

  const clsName = (c: { name: string | null; nameAr: string | null }) =>
    (isAr ? c.nameAr : null) ?? c.name ?? t("noClass");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")} · {tc("showing")} <span className="num">{rows.length}</span>{" "}
          {tc("of")} <span className="num">{total}</span> {tc("results")}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-hajr-navy">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs text-muted-foreground">{t("kpiSessions")}</div>
              <div className="num text-2xl font-bold">{kpi.sessions}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{t("kpiOverallRate")}</div>
            <div className={`num text-2xl font-bold ${rateColor(kpi.rate)}`}>
              {kpi.rate != null ? `${kpi.rate}%` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{t("kpiPresent")}</div>
            <div className="num text-2xl font-bold text-emerald-600">{kpi.present + kpi.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{t("kpiAbsent")}</div>
            <div className="num text-2xl font-bold text-red-600">{kpi.absent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              defaultValue={filters.q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("search")}
              className="ps-9"
            />
          </div>

          <Select
            value={filters.classId || "_all_"}
            onValueChange={(v) => pushParam("classId", v === "_all_" ? null : v)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder={t("filterClass")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">{t("filterAllClasses")}</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {clsName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("filterFrom")}</span>
            <DateField
              className="w-36"
              value={filters.from}
              onChange={(e) => pushParam("from", e.target.value || null)}
            />
            <span className="text-xs text-muted-foreground">{t("filterTo")}</span>
            <DateField
              className="w-36"
              value={filters.to}
              onChange={(e) => pushParam("to", e.target.value || null)}
            />
          </div>
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
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-hajr-navy">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center font-semibold hover:text-hajr-rose"
                      onClick={() => toggleSort("name")}
                    >
                      {t("colStudent")}
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>{t("colClass")}</TableHead>
                  <TableHead className="text-center">{t("colSessions")}</TableHead>
                  <TableHead className="text-center">{t("colPresent")}</TableHead>
                  <TableHead className="text-center">{t("colLate")}</TableHead>
                  <TableHead className="text-center">{t("colAbsent")}</TableHead>
                  <TableHead className="text-center">{t("colExcused")}</TableHead>
                  <TableHead className="text-end">
                    <button
                      type="button"
                      className="inline-flex items-center font-semibold hover:text-hajr-rose"
                      onClick={() => toggleSort("rate")}
                    >
                      {t("colRate")}
                      <SortIcon field="rate" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const display = isAr && r.nameAr ? r.nameAr : r.name;
                  return (
                    <TableRow key={r.studentId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {r.avatar ? <AvatarImage src={r.avatar} alt={display} /> : null}
                            <AvatarFallback className="bg-hajr-deep-navy text-xs text-white">
                              {initials(r.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{display}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.className
                          ? clsName({ name: r.className, nameAr: r.classNameAr })
                          : t("noClass")}
                        {r.classes > 1 ? (
                          <span className="num ms-1 text-xs">(+{r.classes - 1})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="num text-center text-muted-foreground">{r.total}</TableCell>
                      <TableCell className="num text-center font-medium text-emerald-600">
                        {r.present}
                      </TableCell>
                      <TableCell className="num text-center font-medium text-amber-600">
                        {r.late}
                      </TableCell>
                      <TableCell className="num text-center font-medium text-red-600">
                        {r.absent}
                      </TableCell>
                      <TableCell className="num text-center font-medium text-blue-600">
                        {r.excused}
                      </TableCell>
                      <TableCell className={`num text-end font-bold ${rateColor(r.rate)}`}>
                        {r.rate != null ? `${r.rate}%` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {pages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {tc("page")} <span className="num">{page}</span> {tc("of")}{" "}
            <span className="num">{pages}</span>
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushParam("page", String(page - 1))}
            >
              {tc("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => pushParam("page", String(page + 1))}
            >
              {tc("next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
