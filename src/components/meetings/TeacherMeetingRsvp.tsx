"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function TeacherMeetingRsvp({
  meetingId,
  currentRsvp,
  joinUrl,
  status,
}: {
  meetingId: string;
  currentRsvp: string | null;
  joinUrl: string | null;
  status: string;
}) {
  const t = useTranslations("TeacherMeetings");
  const [rsvp, setRsvp] = useState<string | null>(currentRsvp);
  const [saving, setSaving] = useState(false);

  async function send(next: string) {
    setSaving(true);
    const res = await fetch(`/api/teacher/meetings/${meetingId}/rsvp`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) setRsvp(next);
    setSaving(false);
  }

  const options: { key: string; label: string }[] = [
    { key: "YES", label: t("rsvpYes") },
    { key: "MAYBE", label: t("rsvpMaybe") },
    { key: "NO", label: t("rsvpNo") },
  ];

  return (
    <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-medium text-hajr-text">{t("rsvpPrompt")}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => send(opt.key)}
            disabled={saving}
            className={`h-11 rounded-lg border px-5 text-sm font-medium transition ${
              rsvp === opt.key
                ? "border-hajr-rose bg-hajr-rose text-white"
                : "border-hajr-border bg-white text-hajr-text hover:bg-hajr-ivory"
            } disabled:opacity-60`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {joinUrl && status === "LIVE" && (
        <a
          href={joinUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex h-11 items-center rounded-lg bg-hajr-navy px-5 text-sm font-semibold text-white shadow-sm hover:bg-hajr-navy/90"
        >
          🔴 {t("joinZoom")}
        </a>
      )}
      {joinUrl && status !== "LIVE" && (
        <p className="mt-3 text-xs text-hajr-muted">
          {t("zoomLinkLabel")}:{" "}
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-hajr-rose hover:underline"
          >
            {joinUrl}
          </a>
        </p>
      )}
    </div>
  );
}
