"use client";

/**
 * Reusable filterable teacher picker.
 *
 * Built for the targeted-opening AUDIENCE step, but deliberately generic so the
 * SAME filter UI can drive class-assignment later (one consistent experience).
 * Filters by gender / specialization / active / min-rating / max-load and
 * multi-selects teachers, surfacing a live "N will be notified" count.
 *
 * Data comes from listTeachersForPickerAction (admin-gated, read-only). The
 * parent owns persistence: we call onChange(selectedTeacherIds, filter) whenever
 * either changes, and accept initialSelected to round-trip an existing pick.
 */
import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Search, Star, Users, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { listTeachersForPickerAction } from "@/app/[locale]/(app)/admin/_actions/openings";
import type { TeacherFilter, TeacherPickRow } from "@/lib/openings/service";

export interface TeacherFilterPickerProps {
  /** Specialization facet options (distinct values across teachers). */
  specializationOptions: string[];
  /** Pre-selected teacher ids (round-trip an existing SELECTED_TEACHERS pick). */
  initialSelected?: string[];
  /** Pre-fill the filter facets (e.g. restore a saved snapshot). */
  initialFilter?: TeacherFilter;
  /** Called whenever the selection OR filter changes. */
  onChange?: (selectedTeacherIds: string[], filter: TeacherFilter) => void;
  /** Hide the multi-select column (filter-only mode, e.g. quick browse). */
  selectable?: boolean;
}

export function TeacherFilterPicker({
  specializationOptions,
  initialSelected = [],
  initialFilter = {},
  onChange,
  selectable = true,
}: TeacherFilterPickerProps) {
  const t = useTranslations("Openings");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [filter, setFilter] = useState<TeacherFilter>({ activeOnly: true, ...initialFilter });
  const [rows, setRows] = useState<TeacherPickRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [loadError, setLoadError] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Fetch matching teachers whenever the filter changes.
  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const res = await listTeachersForPickerAction(filter);
      if (cancelled) return;
      if (res.ok) {
        setRows(res.data);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filter)]);

  // Notify the parent of selection/filter changes.
  const emit = useCallback(
    (next: Set<string>, f: TeacherFilter) => onChange?.([...next], f),
    [onChange]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      emit(next, filter);
      return next;
    });
  };

  const patchFilter = (patch: Partial<TeacherFilter>) => {
    setFilter((prev) => {
      const f = { ...prev, ...patch };
      emit(selected, f);
      return f;
    });
  };

  const toggleSpec = (spec: string) => {
    const cur = new Set(filter.specializations ?? []);
    if (cur.has(spec)) cur.delete(spec);
    else cur.add(spec);
    patchFilter({ specializations: [...cur] });
  };

  // Count of selected teachers that are currently in the visible (matching) set.
  const selectedVisible = useMemo(
    () => rows.filter((r) => selected.has(r.teacherId)).length,
    [rows, selected]
  );

  const teacherName = (r: TeacherPickRow) => (isAr ? r.nameAr || r.name : r.name);

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* ── Filter facets ── */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-hajr-border bg-hajr-surface p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("filterGender")}</Label>
          <select
            className="w-full rounded-md border border-hajr-border bg-white p-2 text-sm min-h-[38px]"
            value={filter.gender ?? ""}
            onChange={(e) =>
              patchFilter({ gender: e.target.value ? (e.target.value as "MALE" | "FEMALE") : null })
            }
          >
            <option value="">{t("filterAnyGender")}</option>
            <option value="MALE">{t("genderMale")}</option>
            <option value="FEMALE">{t("genderFemale")}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("filterStatus")}</Label>
          <select
            className="w-full rounded-md border border-hajr-border bg-white p-2 text-sm min-h-[38px]"
            value={filter.activeOnly === false ? "inactive" : filter.activeOnly === true ? "active" : "any"}
            onChange={(e) => {
              const v = e.target.value;
              patchFilter({ activeOnly: v === "active" ? true : v === "inactive" ? false : undefined });
            }}
          >
            <option value="active">{t("filterActiveOnly")}</option>
            <option value="any">{t("filterAnyStatus")}</option>
            <option value="inactive">{t("filterInactiveOnly")}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3" /> {t("filterMinRating")}
          </Label>
          <Input
            type="number"
            min={0}
            max={5}
            step="0.5"
            inputMode="decimal"
            placeholder={t("filterAny")}
            value={filter.minRating ?? ""}
            onChange={(e) =>
              patchFilter({ minRating: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" /> {t("filterMaxLoad")}
          </Label>
          <Input
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            placeholder={t("filterAny")}
            value={filter.maxLoad ?? ""}
            onChange={(e) =>
              patchFilter({ maxLoad: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>

        {specializationOptions.length > 0 && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("filterSpecializations")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {specializationOptions.map((spec) => {
                const on = (filter.specializations ?? []).includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpec(spec)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      on
                        ? "border-hajr-rose bg-hajr-rose/10 text-hajr-rose"
                        : "border-hajr-border bg-white text-muted-foreground hover:border-hajr-rose/40"
                    }`}
                  >
                    {spec}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Live count ── */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Search className="h-4 w-4" />
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span>
              <span className="num">{rows.length}</span> {t("teachersMatch")}
            </span>
          )}
        </span>
        {selectable && (
          <span className="flex items-center gap-1.5 font-medium text-hajr-deep-navy">
            <UserCheck className="h-4 w-4 text-hajr-rose" />
            <span className="num">{selected.size}</span> {t("teachersSelected")}
          </span>
        )}
      </div>

      {/* ── Results ── */}
      {loadError ? (
        <div className="rounded-md border border-hajr-error/30 bg-hajr-error/5 p-4 text-sm text-hajr-error">
          {t("loadError")}
        </div>
      ) : rows.length === 0 && !isPending ? (
        <div className="rounded-md border border-hajr-border p-6 text-center text-sm text-muted-foreground">
          {t("noTeachersMatch")}
        </div>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pe-1">
          {rows.map((r) => {
            const on = selected.has(r.teacherId);
            return (
              <li key={r.teacherId}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-2.5 transition ${
                    on ? "border-hajr-rose bg-hajr-rose/5" : "border-hajr-border hover:bg-hajr-hover"
                  } ${selectable ? "" : "cursor-default"}`}
                >
                  {selectable && (
                    <Checkbox checked={on} onCheckedChange={() => toggle(r.teacherId)} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-hajr-deep-navy">
                        {teacherName(r)}
                      </span>
                      {!r.active && <Badge variant="draft">{t("inactiveTag")}</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {r.gender && <span>{r.gender === "MALE" ? t("genderMale") : t("genderFemale")}</span>}
                      {r.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-hajr-warning text-hajr-warning" />
                          <span className="num">{r.rating.toFixed(1)}</span>
                        </span>
                      )}
                      <span>
                        <span className="num">{r.totalStudents}</span> {t("loadStudents")}
                      </span>
                      {r.specializations.length > 0 && (
                        <span className="truncate">{r.specializations.join(" · ")}</span>
                      )}
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {selectable && (
        <p className="text-xs text-muted-foreground">
          <span className="num">{selectedVisible}</span> {t("ofSelectedMatchFilter")}
        </p>
      )}
    </div>
  );
}
