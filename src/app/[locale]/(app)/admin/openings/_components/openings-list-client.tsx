"use client";

import { useTransition } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Users, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reopenOpeningAction, closeOpeningAction } from "../../_actions/openings";

type Row = {
  id: string;
  status: "OPEN" | "CLOSED" | "FILLED";
  nameEn: string;
  nameAr: string;
  type: string;
  total: number;
  active: number;
  openedAt: string;
};

const STATUS_VARIANT: Record<Row["status"], "success" | "info" | "draft"> = {
  OPEN: "success",
  FILLED: "info",
  CLOSED: "draft",
};

export function OpeningsListClient({ rows }: { rows: Row[] }) {
  const t = useTranslations("Openings");
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const statusLabel = (s: Row["status"]) =>
    s === "OPEN" ? t("statusOpen") : s === "FILLED" ? t("statusFilled") : t("statusClosed");

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("adminTitle")}</h1>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-hajr-hover/40">
              <ClipboardList className="h-6 w-6 text-brand-navy" />
            </div>
            <p className="text-sm text-muted-foreground">{t("noOpenings")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((o) => (
            <OpeningCard
              key={o.id}
              row={o}
              locale={locale}
              statusLabel={statusLabel(o.status)}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpeningCard({
  row,
  locale,
  statusLabel,
  onChanged,
}: {
  row: Row;
  locale: string;
  statusLabel: string;
  onChanged: () => void;
}) {
  const t = useTranslations("Openings");
  const isAr = locale === "ar";
  const [isPending, startTransition] = useTransition();

  const name = isAr ? row.nameAr : row.nameEn;
  const openedAt = new Date(row.openedAt).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US");

  const handleReopen = () => {
    startTransition(async () => {
      const res = await reopenOpeningAction(row.id);
      if (res.ok) {
        toast.success(t("reopen"));
        onChanged();
      } else {
        toast.error(mapError(res.error, t));
      }
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      const res = await closeOpeningAction(row.id);
      if (res.ok) {
        toast.success(t("close"));
        onChanged();
      } else {
        toast.error(mapError(res.error, t));
      }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-hajr-navy">{name}</h3>
            <Badge variant="info" className="mt-1">{row.type}</Badge>
          </div>
          <Badge variant={STATUS_VARIANT[row.status]}>{statusLabel}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            <span className="num">{row.total}</span> {t("applicantCount")}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("openedAt")}: <span className="num">{openedAt}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/openings/${row.id}`}>{t("reviewApplicants")}</Link>
          </Button>
          {row.status === "OPEN" ? (
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("close")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleReopen} disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("reopen")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function mapError(code: string, t: ReturnType<typeof useTranslations>): string {
  switch (code) {
    case "ALREADY_OPEN":
      return t("statusOpen");
    case "ALREADY_CLOSED":
      return t("statusClosed");
    case "NOT_FOUND":
      return t("loadError");
    default:
      return t("loadError");
  }
}
