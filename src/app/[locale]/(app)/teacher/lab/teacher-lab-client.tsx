"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

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
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * A starter content template per exercise type — gives the teacher a
 * valid JSON skeleton to fill in, rather than a blank field.
 */
const CONTENT_TEMPLATE: Record<string, object> = {
  GRAMMAR: {
    instructions: "Choose the correct option.",
    items: [
      {
        id: "q1",
        question: "She ___ to school every day.",
        options: [
          { id: "a", text: "goes" },
          { id: "b", text: "go" },
        ],
        correct: "a",
      },
    ],
  },
  VOCABULARY: {
    instructions: "Choose the correct word.",
    items: [
      {
        id: "q1",
        question: "Synonym of 'happy'?",
        options: [
          { id: "a", text: "glad" },
          { id: "b", text: "sad" },
        ],
        correct: "a",
      },
    ],
  },
  READING: {
    text: "Paste the reading passage here.",
    questions: [
      {
        id: "q1",
        question: "What is the main idea?",
        options: [
          { id: "a", text: "Option A" },
          { id: "b", text: "Option B" },
        ],
        correct: "a",
      },
    ],
  },
  LISTENING: {
    audioUrl: "",
    transcript: "",
    questions: [
      {
        id: "q1",
        question: "What did the speaker say?",
        options: [
          { id: "a", text: "Option A" },
          { id: "b", text: "Option B" },
        ],
        correct: "a",
      },
    ],
  },
  WRITING: {
    prompt: "Write about your weekend.",
    minWords: 80,
    maxWords: 150,
    rubric: ["Task response", "Grammar", "Vocabulary"],
  },
  SPEAKING: {
    prompt: "Introduce yourself.",
    targetText: "Hello, my name is...",
    scoringCriteria: ["Fluency", "Pronunciation"],
  },
};

export function TeacherLabClient({
  myExercises,
  libraryExercises,
}: {
  myExercises: Exercise[];
  libraryExercises: Exercise[];
}) {
  const t = useTranslations("Lab");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("GRAMMAR");
  const [level, setLevel] = useState("B1");
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [contentJson, setContentJson] = useState(
    JSON.stringify(CONTENT_TEMPLATE.GRAMMAR, null, 2)
  );
  const [err, setErr] = useState("");

  function onTypeChange(newType: string) {
    setType(newType);
    setContentJson(JSON.stringify(CONTENT_TEMPLATE[newType], null, 2));
  }

  async function create(publish: boolean) {
    setErr("");
    let content: unknown;
    try {
      content = JSON.parse(contentJson);
    } catch {
      setErr("Invalid JSON content");
      return;
    }
    if (!title.trim() || !titleAr.trim()) {
      setErr("Both titles are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/lab/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          level,
          title,
          titleAr,
          content,
          isPublished: publish,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setTitle("");
        setTitleAr("");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "Failed to create exercise");
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(ex: Exercise) {
    await fetch(`/api/teacher/lab/exercises/${ex.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !ex.isPublished }),
    });
    router.refresh();
  }

  const ExerciseRow = ({ ex, owned }: { ex: Exercise; owned: boolean }) => (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="font-medium">{isAr ? ex.titleAr : ex.title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{ex.type}</Badge>
            <span className="num">{ex.level}</span>
            <span className="num">
              {ex.attempts} {t("attempts")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ex.isPublished ? "success" : "outline"}>
            {ex.isPublished ? t("published") : t("draft")}
          </Badge>
          {owned && (
            <Button size="sm" variant="outline" onClick={() => togglePublish(ex)}>
              {ex.isPublished ? t("unpublish") : t("publish")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="bg-brand-rose text-white">
          <Plus className="me-2 h-4 w-4" />
          {t("createExercise")}
        </Button>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">{t("myExercises")}</TabsTrigger>
          <TabsTrigger value="library">{t("publicLibrary")}</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="space-y-2">
          {myExercises.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                {t("noExercises")}
              </CardContent>
            </Card>
          ) : (
            myExercises.map((ex) => (
              <ExerciseRow key={ex.id} ex={ex} owned />
            ))
          )}
        </TabsContent>
        <TabsContent value="library" className="space-y-2">
          {libraryExercises.map((ex) => (
            <ExerciseRow key={ex.id} ex={ex} owned={false} />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("createExercise")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("exerciseType")}</Label>
                <select
                  value={type}
                  onChange={(e) => onTypeChange(e.target.value)}
                  className="mt-1 w-full rounded-md border p-2 text-sm"
                >
                  {TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {ty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("level")}</Label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="mt-1 w-full rounded-md border p-2 text-sm"
                >
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>{t("exerciseTitle")} (EN)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("exerciseTitle")} (AR)</Label>
              <Input
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                dir="rtl"
              />
            </div>
            <div>
              <Label>Content (JSON)</Label>
              <Textarea
                rows={8}
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => create(false)}
              disabled={saving}
            >
              {t("draft")}
            </Button>
            <Button
              onClick={() => create(true)}
              disabled={saving}
              className="bg-brand-rose text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("publish")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
