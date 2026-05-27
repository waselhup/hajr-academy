"use client";

/**
 * AdminCommandPalette — Cmd+K (Ctrl+K) global quick search & navigation.
 *
 * Mounts once in the app layout for admin/super-admin users. Opens with
 * Cmd+K, closes with Esc. Three sections: Students, Teachers, Classes,
 * plus a Quick Navigation list that fuzzy-matches the admin sidebar.
 *
 * AI chat lives separately in AdminChatPanel (floating bottom-right
 * button) so the two cockpit tools don't fight over the same hotkey.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Command } from "cmdk";
import {
  Search,
  Users,
  GraduationCap,
  BookText,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADMIN_DASHBOARD_ITEM,
  ADMIN_NAV_GROUPS,
} from "@/components/shell/sidebar";

interface SearchResult {
  id: string;
  name: string;
  subtext: string;
  href: string;
}
interface SearchResponse {
  students: SearchResult[];
  teachers: SearchResult[];
  classes: SearchResult[];
}

export default function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>({
    students: [],
    teachers: [],
    classes: [],
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Search");
  const tNav = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── keyboard shortcut ────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      }
    }
    // Custom event so the mobile bottom-nav Search tab can also open us.
    const onCustomOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hajr:open-command-palette", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hajr:open-command-palette", onCustomOpen);
    };
  }, []);

  // Auto-focus the input on open.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery("");
      setResults({ students: [], teachers: [], classes: [] });
    }
  }, [open]);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* ── debounced search ─────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults({ students: [], teachers: [], classes: [] });
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/quick-search?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = (await res.json()) as SearchResponse;
          setResults(data);
        }
      } catch {
        // ignore — show empty results
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [query, open]);

  /* ── nav items (sidebar) — searchable & always shown ──────── */
  const navItems = useMemo(() => {
    const items = [
      ADMIN_DASHBOARD_ITEM,
      ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
    ];
    return items.map((it) => ({
      key: it.key,
      // tNav(it.key) is the translated label
      label: tNav(it.key as any),
      href: it.href,
      Icon: it.icon,
    }));
  }, [tNav]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter(
      (it) =>
        it.label.toLowerCase().includes(q) || it.href.toLowerCase().includes(q)
    );
  }, [navItems, query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      const prefixed = href.startsWith("/") ? `/${locale}${href}` : href;
      router.push(prefixed);
    },
    [router, locale]
  );

  if (!open) return null;

  const hasAnyResult =
    results.students.length > 0 ||
    results.teachers.length > 0 ||
    results.classes.length > 0 ||
    filteredNav.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-brand-navy/60 backdrop-blur-sm p-4 sm:pt-[12vh]"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <Command
        loop
        className="w-full max-w-2xl overflow-hidden rounded-xl border bg-white shadow-2xl"
      >
        {/* Header / Input */}
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder={t("placeholder")}
            className="flex-1 bg-transparent text-sm text-brand-navy outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            {query ? t("noResults") : t("typeToSearch")}
          </Command.Empty>

          {/* Students */}
          {results.students.length > 0 && (
            <Command.Group
              heading={t("sectionStudents")}
              className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {results.students.map((s) => (
                <PaletteItem
                  key={`s-${s.id}`}
                  value={`student ${s.name} ${s.subtext}`}
                  onSelect={() => go(s.href)}
                  icon={<Users className="h-4 w-4 text-blue-600" />}
                  label={s.name}
                  subtext={s.subtext}
                />
              ))}
            </Command.Group>
          )}

          {/* Teachers */}
          {results.teachers.length > 0 && (
            <Command.Group
              heading={t("sectionTeachers")}
              className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {results.teachers.map((t) => (
                <PaletteItem
                  key={`t-${t.id}`}
                  value={`teacher ${t.name} ${t.subtext}`}
                  onSelect={() => go(t.href)}
                  icon={<GraduationCap className="h-4 w-4 text-emerald-600" />}
                  label={t.name}
                  subtext={t.subtext}
                />
              ))}
            </Command.Group>
          )}

          {/* Classes */}
          {results.classes.length > 0 && (
            <Command.Group
              heading={t("sectionClasses")}
              className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {results.classes.map((c) => (
                <PaletteItem
                  key={`c-${c.id}`}
                  value={`class ${c.name} ${c.subtext}`}
                  onSelect={() => go(c.href)}
                  icon={<BookText className="h-4 w-4 text-rose-600" />}
                  label={c.name}
                  subtext={c.subtext}
                />
              ))}
            </Command.Group>
          )}

          {/* Quick navigation (always shown — fuzzy on the sidebar) */}
          {filteredNav.length > 0 && (
            <Command.Group
              heading={t("sectionNav")}
              className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {filteredNav.slice(0, 8).map((n) => {
                const Icon = n.Icon;
                return (
                  <PaletteItem
                    key={n.key}
                    value={`nav ${n.label} ${n.href}`}
                    onSelect={() => go(n.href)}
                    icon={<Icon className="h-4 w-4 text-brand-navy" />}
                    label={n.label}
                    subtext={n.href}
                  />
                );
              })}
            </Command.Group>
          )}
        </Command.List>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span>{t("footerHint")}</span>
          <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono">⌘K</kbd>
        </div>
      </Command>
    </div>
  );
}

function PaletteItem({
  value,
  onSelect,
  icon,
  label,
  subtext,
}: {
  value: string;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  subtext?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm",
        "aria-selected:bg-brand-navy/[0.06] aria-selected:text-brand-navy",
        "hover:bg-muted"
      )}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{label}</p>
        {subtext && (
          <p className="truncate text-[11px] text-muted-foreground">{subtext}</p>
        )}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rtl-flip" />
    </Command.Item>
  );
}
