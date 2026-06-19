"use client";

/**
 * Lab Studio v2 — exercise builder (teacher + admin). A friendly, no-JSON
 * block composer: pick skill/level, choose who gets it (Library, a whole class,
 * or specific students + due date), then stack blocks (MCQ, fill-in-the-blanks,
 * word order, matching, reading passage, listening clip, writing, speaking…).
 */
import { useState, useTransition, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Loader2, Save, Users, UserCheck, Search,
  BookOpen, Headphones, ListChecks, ToggleLeft, TextCursorInput, ArrowRightLeft, Link2, PenLine, Mic, Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimeField } from "@/components/ui/western-fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLOCK_META, type Block, type BlockKind } from "@/lib/lab/blocks";
import { saveLabExerciseAction } from "@/app/[locale]/(app)/teacher/lab/_actions/lab-studio";

const ICONS: Record<string, any> = { BookOpen, Headphones, ListChecks, ToggleLeft, TextCursorInput, ArrowRightLeft, Link2, PenLine, Mic };
const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"] as const;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const KIND_ORDER: BlockKind[] = ["PASSAGE", "MEDIA", "MCQ", "TRUE_FALSE", "FILL_BLANK", "WORD_ORDER", "MATCHING", "SHORT_TEXT", "RECORD"];

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function newBlock(kind: BlockKind): Block {
  const id = uid();
  switch (kind) {
    case "PASSAGE": return { id, kind, text: "" } as Block;
    case "MEDIA": return { id, kind, mediaKind: "AUDIO", path: "" } as Block;
    case "MCQ": return { id, kind, prompt: "", options: [{ id: uid(), text: "" }, { id: uid(), text: "" }], correctOptionId: "", points: 1 } as Block;
    case "TRUE_FALSE": return { id, kind, prompt: "", answer: true, points: 1 } as Block;
    case "FILL_BLANK": return { id, kind, text: "", blanks: [{ index: 1, accept: [""] }], points: 1 } as Block;
    case "WORD_ORDER": return { id, kind, tokens: [], points: 1 } as Block;
    case "MATCHING": return { id, kind, pairs: [{ id: uid(), left: "", right: "" }, { id: uid(), left: "", right: "" }], points: 1 } as Block;
    case "SHORT_TEXT": return { id, kind, prompt: "" } as Block;
    case "RECORD": return { id, kind, prompt: "", mediaKind: "AUDIO" } as Block;
  }
}

type ClassOpt = { id: string; label: string };

export function ExerciseBuilder({
  mode, existing, classes, classStudents, backHref,
}: {
  mode: "create" | "edit";
  existing?: any;
  classes: ClassOpt[];
  classStudents: Record<string, { id: string; name: string }[]>;
  backHref: string;
}) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [titleAr, setTitleAr] = useState(existing?.titleAr ?? "");
  const [type, setType] = useState<string>(existing?.type ?? "GRAMMAR");
  const [level, setLevel] = useState<string>(existing?.level ?? "A1");
  const [instructions, setInstructions] = useState(existing?.instructions ?? "");
  const [blocks, setBlocks] = useState<Block[]>(existing?.blocks ?? []);
  const [audience, setAudience] = useState<"LIBRARY" | "ALL_CLASS" | "SELECTED">(existing?.audience ?? "LIBRARY");
  const [classId, setClassId] = useState<string>(existing?.classId ?? classes[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(existing?.studentIds ?? []);
  const [dueDate, setDueDate] = useState<string>(existing?.dueDate ?? "");
  const [studentQuery, setStudentQuery] = useState("");

  const roster = classStudents[classId] ?? [];
  const filteredRoster = studentQuery.trim()
    ? roster.filter((s) => s.name.toLowerCase().includes(studentQuery.trim().toLowerCase()))
    : roster;

  const setBlock = (id: string, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  const removeBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id));
  const moveBlock = (i: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = () => {
    if (title.trim().length < 2) return toast.error(isAr ? "العنوان مطلوب" : "Title is required");
    if (!titleAr.trim()) return toast.error(isAr ? "العنوان بالعربية مطلوب" : "Arabic title is required");
    if (blocks.length === 0) return toast.error(isAr ? "أضف عنصراً واحداً على الأقل" : "Add at least one block");
    if (audience !== "LIBRARY" && !classId) return toast.error(isAr ? "اختر صفاً" : "Pick a class");
    if (audience === "SELECTED" && selectedIds.length === 0) return toast.error(isAr ? "اختر طلاباً" : "Pick students");
    startTransition(async () => {
      const res = await saveLabExerciseAction({
        id: existing?.id,
        type: type as any, level: level as any,
        title: title.trim(), titleAr: titleAr.trim(),
        instructions: instructions.trim() || undefined,
        blocks,
        audience,
        classId: audience !== "LIBRARY" ? classId : undefined,
        studentIds: audience === "SELECTED" ? selectedIds : undefined,
        dueDate: audience !== "LIBRARY" && dueDate ? dueDate : null,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(isAr ? "تم الحفظ" : "Saved");
      router.push(backHref);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5" dir={isAr ? "rtl" : "ltr"}>
      {/* Meta */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label={isAr ? "العنوان (إنجليزي)" : "Title (English)"}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label={isAr ? "العنوان (عربي)" : "Title (Arabic)"}><Input dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
          <Field label={isAr ? "المهارة" : "Skill"}>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SKILLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={isAr ? "المستوى" : "Level (CEFR)"}>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={isAr ? "تعليمات (اختياري)" : "Instructions (optional)"}>
              <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Scope / targeting */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <Label>{isAr ? "من يحصل على هذا التمرين؟" : "Who gets this exercise?"}</Label>
          <div className="grid grid-cols-3 gap-2">
            <ScopeBtn active={audience === "LIBRARY"} onClick={() => setAudience("LIBRARY")} icon={<BookOpen className="h-4 w-4" />} label={isAr ? "المكتبة" : "Library"} />
            <ScopeBtn active={audience === "ALL_CLASS"} onClick={() => setAudience("ALL_CLASS")} icon={<Users className="h-4 w-4" />} label={isAr ? "صف كامل" : "Whole class"} disabled={classes.length === 0} />
            <ScopeBtn active={audience === "SELECTED"} onClick={() => setAudience("SELECTED")} icon={<UserCheck className="h-4 w-4" />} label={isAr ? "طلاب محددون" : "Specific students"} disabled={classes.length === 0} />
          </div>
          {audience === "LIBRARY" ? (
            <p className="text-xs text-muted-foreground">{isAr ? "متاح لكل الطلاب في مكتبة المعمل للتدرّب الذاتي." : "Available to all students in the Lab library for self-practice."}</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={isAr ? "الصف" : "Class"}>
                  <Select value={classId} onValueChange={(v) => { setClassId(v); setSelectedIds([]); }}>
                    <SelectTrigger><SelectValue placeholder={isAr ? "اختر صفاً" : "Pick a class"} /></SelectTrigger>
                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={isAr ? "تاريخ التسليم (اختياري)" : "Due date (optional)"}>
                  <DateTimeField value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
              </div>
              {audience === "SELECTED" && (
                <div className="space-y-2 rounded-card border border-hajr-border bg-hajr-ivory p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span><span className="num">{selectedIds.length}</span> / <span className="num">{roster.length}</span> {isAr ? "طالب" : "students"}</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedIds(roster.map((s) => s.id))}>{isAr ? "الكل" : "All"}</Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedIds([])}>{isAr ? "مسح" : "Clear"}</Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-2.5 rtl:right-2.5" />
                    <Input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder={isAr ? "بحث عن طالب" : "Search students"} className="ltr:pl-8 rtl:pr-8" />
                  </div>
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-hajr-border bg-white p-1">
                    {filteredRoster.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground">{isAr ? "لا يوجد طلاب" : "No students"}</p>
                    ) : filteredRoster.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-hajr-chip">
                        <Checkbox checked={selectedIds.includes(s.id)} onCheckedChange={() => setSelectedIds((p) => p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id])} />
                        <span className="truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocks */}
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <BlockCard key={b.id} block={b} index={i} total={blocks.length} isAr={isAr}
            onChange={(patch) => setBlock(b.id, patch)} onRemove={() => removeBlock(b.id)} onMove={(d) => moveBlock(i, d)} />
        ))}
        {blocks.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{isAr ? "ابدأ بإضافة عنصر من الأسفل ↓" : "Start by adding a block below ↓"}</CardContent></Card>
        )}
      </div>

      {/* Add block menu */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">{isAr ? "أضف عنصراً" : "Add a block"}</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {KIND_ORDER.map((k) => {
              const Icon = ICONS[BLOCK_META[k].icon] ?? ListChecks;
              return (
                <button key={k} type="button" onClick={() => setBlocks((bs) => [...bs, newBlock(k)])}
                  className="flex items-center gap-2 rounded-card border border-hajr-border bg-white px-3 py-2.5 text-start text-sm transition-colors hover:bg-hajr-chip">
                  <span className="icon-chip h-8 w-8 shrink-0"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block truncate font-medium text-hajr-deep-navy">{isAr ? BLOCK_META[k].ar : BLOCK_META[k].en}</span></span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-hajr-border bg-hajr-ivory/95 py-3 backdrop-blur">
        <Button variant="outline" onClick={() => router.push(backHref)} disabled={pending}>{isAr ? "إلغاء" : "Cancel"}</Button>
        <Button variant="cta" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
          {isAr ? "حفظ التمرين" : "Save exercise"}
        </Button>
      </div>
    </div>
  );
}

function ScopeBtn({ active, onClick, icon, label, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-hajr-rose bg-hajr-rose/10 font-medium text-hajr-rose" : "border-hajr-border hover:bg-hajr-chip"}`}>
      {icon}{label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

// ─────────── per-block editor ───────────
function BlockCard({ block, index, total, isAr, onChange, onRemove, onMove }: {
  block: Block; index: number; total: number; isAr: boolean;
  onChange: (patch: Partial<Block>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void;
}) {
  const Icon = ICONS[BLOCK_META[block.kind].icon] ?? ListChecks;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="icon-chip h-8 w-8"><Icon className="h-4 w-4" /></span>
            <span className="text-sm font-semibold text-hajr-deep-navy">{isAr ? BLOCK_META[block.kind].ar : BLOCK_META[block.kind].en}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-hajr-error" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <BlockEditor block={block} isAr={isAr} onChange={onChange} />
      </CardContent>
    </Card>
  );
}

function BlockEditor({ block, isAr, onChange }: { block: Block; isAr: boolean; onChange: (patch: Partial<Block>) => void }) {
  switch (block.kind) {
    case "PASSAGE":
      return <Textarea rows={4} placeholder={isAr ? "نص القراءة…" : "Reading passage…"} value={(block as any).text} onChange={(e) => onChange({ text: e.target.value } as any)} />;
    case "MEDIA":
      return <MediaEditor block={block} isAr={isAr} onChange={onChange} />;
    case "MCQ":
      return <McqEditor block={block} isAr={isAr} onChange={onChange} />;
    case "TRUE_FALSE":
      return (
        <div className="space-y-2">
          <Textarea rows={2} placeholder={isAr ? "العبارة" : "Statement"} value={(block as any).prompt} onChange={(e) => onChange({ prompt: e.target.value } as any)} />
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" onClick={() => onChange({ answer: v } as any)}
                className={`rounded-xl border px-4 py-2 text-sm ${(block as any).answer === v ? "border-hajr-rose bg-hajr-rose/10 font-medium text-hajr-rose" : "border-hajr-border hover:bg-hajr-chip"}`}>
                {v ? (isAr ? "صح" : "True") : (isAr ? "خطأ" : "False")}
              </button>
            ))}
          </div>
        </div>
      );
    case "FILL_BLANK":
      return <FillBlankEditor block={block} isAr={isAr} onChange={onChange} />;
    case "WORD_ORDER":
      return (
        <div className="space-y-1.5">
          <Input placeholder={isAr ? "اكتب الجملة بالترتيب الصحيح" : "Type the sentence in the correct order"}
            defaultValue={((block as any).tokens ?? []).join(" ")}
            onChange={(e) => onChange({ tokens: e.target.value.trim().split(/\s+/).filter(Boolean) } as any)} />
          <p className="text-xs text-muted-foreground">{isAr ? "سيتم خلط الكلمات للطالب." : "The words will be scrambled for the student."}</p>
        </div>
      );
    case "MATCHING":
      return <MatchingEditor block={block} isAr={isAr} onChange={onChange} />;
    case "SHORT_TEXT":
      return <Textarea rows={2} placeholder={isAr ? "السؤال / الموضوع للكتابة" : "Writing prompt"} value={(block as any).prompt} onChange={(e) => onChange({ prompt: e.target.value } as any)} />;
    case "RECORD":
      return (
        <div className="space-y-2">
          <Textarea rows={2} placeholder={isAr ? "ماذا ينطق الطالب؟" : "What should the student say?"} value={(block as any).prompt} onChange={(e) => onChange({ prompt: e.target.value } as any)} />
          <Select value={(block as any).mediaKind} onValueChange={(v) => onChange({ mediaKind: v } as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="AUDIO">{isAr ? "صوت" : "Audio"}</SelectItem><SelectItem value="VIDEO">{isAr ? "فيديو" : "Video"}</SelectItem></SelectContent>
          </Select>
        </div>
      );
  }
}

function McqEditor({ block, isAr, onChange }: any) {
  const opts: { id: string; text: string }[] = block.options;
  const setOpt = (id: string, text: string) => onChange({ options: opts.map((o) => o.id === id ? { ...o, text } : o) });
  return (
    <div className="space-y-2">
      <Textarea rows={2} placeholder={isAr ? "السؤال" : "Question"} value={block.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
      <div className="space-y-1.5">
        {opts.map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <button type="button" title={isAr ? "الإجابة الصحيحة" : "Correct"} onClick={() => onChange({ correctOptionId: o.id })}
              className={`h-5 w-5 shrink-0 rounded-full border-2 ${block.correctOptionId === o.id ? "border-hajr-rose bg-hajr-rose" : "border-hajr-border"}`} />
            <Input value={o.text} onChange={(e) => setOpt(o.id, e.target.value)} placeholder={isAr ? "خيار" : "Option"} />
            {opts.length > 2 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-hajr-error" onClick={() => onChange({ options: opts.filter((x) => x.id !== o.id) })}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        ))}
      </div>
      {opts.length < 8 && <Button type="button" variant="outline" size="sm" onClick={() => onChange({ options: [...opts, { id: uid(), text: "" }] })}><Plus className="me-1 h-3 w-3" />{isAr ? "خيار" : "Option"}</Button>}
    </div>
  );
}

function FillBlankEditor({ block, isAr, onChange }: any) {
  const blanks: { index: number; accept: string[] }[] = block.blanks;
  return (
    <div className="space-y-2">
      <Textarea rows={2} placeholder={isAr ? "النص، استخدم {{1}} {{2}} للفراغات" : "Text — use {{1}}, {{2}} for gaps"} value={block.text} onChange={(e) => onChange({ text: e.target.value })} />
      <div className="space-y-1.5">
        {blanks.map((bl, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="num w-10 shrink-0 text-xs text-muted-foreground">{`{{${bl.index}}}`}</span>
            <Input value={bl.accept.join(", ")} placeholder={isAr ? "الإجابات المقبولة (افصل بفاصلة)" : "Accepted answers (comma-separated)"}
              onChange={(e) => onChange({ blanks: blanks.map((x, j) => j === i ? { ...x, accept: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x) })} />
            {blanks.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-hajr-error" onClick={() => onChange({ blanks: blanks.filter((_, j) => j !== i).map((x, j) => ({ ...x, index: j + 1 })) })}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ blanks: [...blanks, { index: blanks.length + 1, accept: [""] }] })}><Plus className="me-1 h-3 w-3" />{isAr ? "فراغ" : "Blank"}</Button>
    </div>
  );
}

function MatchingEditor({ block, isAr, onChange }: any) {
  const pairs: { id: string; left: string; right: string }[] = block.pairs;
  const setPair = (id: string, k: "left" | "right", v: string) => onChange({ pairs: pairs.map((p) => p.id === id ? { ...p, [k]: v } : p) });
  return (
    <div className="space-y-2">
      {pairs.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <Input value={p.left} onChange={(e) => setPair(p.id, "left", e.target.value)} placeholder={isAr ? "يسار" : "Left"} />
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input value={p.right} onChange={(e) => setPair(p.id, "right", e.target.value)} placeholder={isAr ? "يمين" : "Right"} />
          {pairs.length > 2 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-hajr-error" onClick={() => onChange({ pairs: pairs.filter((x) => x.id !== p.id) })}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ))}
      {pairs.length < 10 && <Button type="button" variant="outline" size="sm" onClick={() => onChange({ pairs: [...pairs, { id: uid(), left: "", right: "" }] })}><Plus className="me-1 h-3 w-3" />{isAr ? "زوج" : "Pair"}</Button>}
    </div>
  );
}

function MediaEditor({ block, isAr, onChange }: any) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", block.mediaKind === "VIDEO" ? "VIDEO" : "AUDIO");
      const res = await fetch("/api/assignments/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.attachment) throw new Error(json.error || "upload failed");
      const a = json.attachment;
      onChange({ path: a.path, fileName: a.fileName, mimeType: a.mimeType, durationSec: a.durationSec, mediaKind: a.kind === "VIDEO" ? "VIDEO" : "AUDIO" });
      toast.success(isAr ? "تم الرفع" : "Uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? (isAr ? "فشل الرفع" : "Upload failed"));
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <Select value={block.mediaKind} onValueChange={(v) => onChange({ mediaKind: v })}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="AUDIO">{isAr ? "صوت" : "Audio"}</SelectItem><SelectItem value="VIDEO">{isAr ? "فيديو" : "Video"}</SelectItem></SelectContent>
      </Select>
      <input ref={fileRef} type="file" accept={block.mediaKind === "VIDEO" ? "video/*" : "audio/*"} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
        {block.path ? (isAr ? "استبدال الملف" : "Replace file") : (isAr ? "رفع ملف" : "Upload file")}
      </Button>
      {block.path && <p className="truncate text-xs text-hajr-success">{block.fileName || (isAr ? "تم الرفع ✓" : "Uploaded ✓")}</p>}
    </div>
  );
}
