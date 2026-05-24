"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload } from "lucide-react";

interface Question {
  id: string;
  section: string;
  difficulty: number;
  type: string;
  questionText: string;
  topic: string | null;
  totalAttempts: number;
  accuracy: number | null;
}

const SECTIONS = ["READING", "LISTENING", "GRAMMAR", "VOCABULARY", "WRITING"];

export function TestBankClient() {
  const t = useTranslations("Exam");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("");
  const [q, setQ] = useState("");
  const [difficultOnly, setDifficultOnly] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      if (section) sp.set("section", section);
      if (q) sp.set("q", q);
      if (difficultOnly) sp.set("difficult", "1");
      const res = await fetch(`/api/admin/test-bank/questions?${sp}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, section, q, difficultOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function onImport(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/test-bank/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(
          `${t("imported")}: ${data.imported} · ${t("skipped")}: ${data.skipped}`
        );
        load();
      } else {
        setImportResult(data.error ?? "Import failed");
      }
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("questionBank")}
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="max-w-xs"
        />
        <select
          value={section}
          onChange={(e) => {
            setPage(1);
            setSection(e.target.value);
          }}
          className="rounded-md border p-2 text-sm"
        >
          <option value="">{t("section")}</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          variant={difficultOnly ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setPage(1);
            setDifficultOnly((d) => !d);
          }}
        >
          {t("difficultQuestions")}
        </Button>
        <div className="ms-auto">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
            }}
          />
          <Button
            size="sm"
            className="bg-hajr-deep-navy text-white"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="me-2 h-4 w-4" />
            )}
            {t("importCsv")}
          </Button>
        </div>
      </div>

      {importResult && (
        <Card className="border-brand-mint bg-brand-mint/10">
          <CardContent className="p-3 text-sm">{importResult}</CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-rose" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("question")}</TableHead>
                  <TableHead>{t("section")}</TableHead>
                  <TableHead>{t("topic")}</TableHead>
                  <TableHead>{t("usageCount")}</TableHead>
                  <TableHead>{t("accuracyRate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="p-6 text-center text-muted-foreground"
                    >
                      —
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((qq) => (
                    <TableRow key={qq.id}>
                      <TableCell className="max-w-md truncate text-sm">
                        {qq.questionText}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{qq.section}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {qq.topic ?? "—"}
                      </TableCell>
                      <TableCell className="num">{qq.totalAttempts}</TableCell>
                      <TableCell>
                        {qq.accuracy != null ? (
                          <Badge
                            variant={
                              qq.accuracy < 30
                                ? "danger"
                                : qq.accuracy < 60
                                ? "warning"
                                : "success"
                            }
                            className="num"
                          >
                            {qq.accuracy}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-sm num">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
