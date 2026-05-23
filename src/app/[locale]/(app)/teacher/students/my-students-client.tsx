"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";

export type StudentCard = {
  id: string;
  name: string;
  nameAr: string | null;
  avatar: string | null;
  gradeLevel: string | null;
  schoolName: string | null;
  activePackage: string | null;
  className: string;
  cohortCode: string;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MyStudentsClient({
  locale,
  students,
}: {
  locale: string;
  students: StudentCard[];
}) {
  const t = useTranslations();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) => {
      return (
        s.name.toLowerCase().includes(needle) ||
        (s.nameAr ?? "").toLowerCase().includes(needle) ||
        s.cohortCode.toLowerCase().includes(needle) ||
        s.className.toLowerCase().includes(needle)
      );
    });
  }, [q, students]);

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("TeacherStudents.noStudents")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={locale === "ar" ? "بحث بالاسم أو الفصل…" : "Search by name or class…"}
          className="ps-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const displayName = locale === "ar" && s.nameAr ? s.nameAr : s.name;
          return (
            <Card key={s.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-brand-rose/20">
                    {s.avatar ? (
                      <AvatarImage src={s.avatar} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="bg-brand-navy text-white">
                      {initials(s.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-navy">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[s.gradeLevel, s.schoolName].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 rounded-md border border-brand-navy/10 bg-brand-navy/[0.02] p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📚 {t("TeacherStudents.classLabel")}:</span>
                    <span className="num font-medium">{s.cohortCode}</span>
                  </div>
                  {s.activePackage && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">💎 {t("TeacherStudents.packageLabel")}:</span>
                      <Badge variant="default" className="text-[10px]">
                        {s.activePackage}
                      </Badge>
                    </div>
                  )}
                </div>

                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/${locale}/teacher/students/${s.id}`}>
                    {t("TeacherStudents.viewProfile")}
                    <ArrowRight className="ms-2 h-3.5 w-3.5 rtl-flip" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
