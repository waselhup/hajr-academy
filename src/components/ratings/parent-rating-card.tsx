"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

type Summary = {
  ok: boolean;
  child?: { id: string; name: string };
  teachers?: Array<{
    teacherId: string;
    teacherName: string;
    avgRating: number | null;
    ratingsCount: number;
    teacherNotes: Array<{ when: string; noteAr: string | null; noteEn: string | null }>;
    alreadyRated: boolean;
  }>;
};

export function ParentRatingCard({ childId }: { childId: string }) {
  const t = useTranslations("Ratings");
  const [data, setData] = useState<Summary | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [improved, setImproved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/parent/monthly-summary/${childId}`, { cache: "no-store" });
        const j: Summary = await r.json();
        if (!cancelled && j.ok) setData(j);
      } catch {}
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  if (!data || !data.teachers || data.teachers.length === 0) return null;

  async function submit(teacherId: string) {
    if (stars < 1) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ratings/monthly-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          studentId: childId,
          rating: stars,
          comment,
          improved,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "rate failed");
      toast.success(t("thanks"));
      setOpenFor(null);
      setStars(0);
      setComment("");
      setImproved("");
      // Reload data
      const r2 = await fetch(`/api/parent/monthly-summary/${childId}`, { cache: "no-store" });
      const j2: Summary = await r2.json();
      if (j2.ok) setData(j2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function skip(teacherId: string) {
    try {
      await fetch(`/api/ratings/monthly-parent?teacherId=${teacherId}`, {
        method: "DELETE",
      });
      const r2 = await fetch(`/api/parent/monthly-summary/${childId}`, { cache: "no-store" });
      const j2: Summary = await r2.json();
      if (j2.ok) setData(j2);
    } catch {}
  }

  return (
    <Card className="border-hajr-rose/30 bg-hajr-rose/5">
      <CardContent className="space-y-4 p-6">
        <div>
          <div className="text-sm font-semibold text-hajr-deep-navy">
            {t("parentCardTitle")} · {data.child?.name}
          </div>
          <div className="text-xs text-hajr-gray-600">{t("parentCardBody")}</div>
        </div>

        {data.teachers.map((teacher) => (
          <div key={teacher.teacherId} className="rounded-md border border-hajr-rose/30 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{teacher.teacherName}</div>
              <Badge variant="outline">
                {teacher.avgRating !== null ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {teacher.avgRating} ({teacher.ratingsCount})
                  </span>
                ) : (
                  t("noRatingsYet")
                )}
              </Badge>
            </div>
            {teacher.teacherNotes.length > 0 && (
              <ul className="ms-4 mt-2 list-disc text-xs text-hajr-gray-600">
                {teacher.teacherNotes.map((n, i) => (
                  <li key={i} className="line-clamp-1">
                    {n.noteAr || n.noteEn || "—"}
                  </li>
                ))}
              </ul>
            )}

            {teacher.alreadyRated ? (
              <div className="mt-2 text-xs text-hajr-mint">{t("alreadyRated")}</div>
            ) : openFor === teacher.teacherId ? (
              <div className="mt-3 space-y-2">
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setStars(n)}
                      className={`text-2xl ${n <= stars ? "text-yellow-400" : "text-gray-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {["YES", "NO", "UNSURE"].map((v) => (
                    <Button
                      key={v}
                      size="sm"
                      variant={improved === v ? "default" : "outline"}
                      onClick={() => setImproved(v)}
                    >
                      {t(`improved_${v}`)}
                    </Button>
                  ))}
                </div>
                <Textarea
                  rows={2}
                  placeholder={t("anythingElse")}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenFor(null)}>
                    {t("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || stars < 1}
                    onClick={() => submit(teacher.teacherId)}
                    className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
                  >
                    {t("submit")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => skip(teacher.teacherId)}>
                  {t("skipThisMonth")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpenFor(teacher.teacherId)}
                  className="bg-hajr-rose text-white hover:bg-hajr-rose/90"
                >
                  {t("rateThisMonth")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
