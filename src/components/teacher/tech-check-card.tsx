import { getTechCheckCardState, getLastTechCheckSummary } from "@/lib/teacher/tech-check-gate";
import { TechCheckCardClient } from "./tech-check-card-client";

/**
 * Proactive tech-check card for the teacher Overview. Server component:
 * computes the 1-hour-window state once, then hands it to the client card
 * which owns the wizard dialog. Purely optional — passing here frees the
 * next hour so the teacher skips the mandatory class-entry popup.
 *
 * Never throws — the helpers degrade to "none" if the DB is unreachable.
 */
export async function TechCheckCard({ userId }: { userId: string }) {
  const [{ state, minutesLeft }, lastSummary] = await Promise.all([
    getTechCheckCardState(userId),
    getLastTechCheckSummary(userId),
  ]);

  return (
    <TechCheckCardClient state={state} minutesLeft={minutesLeft} lastSummary={lastSummary} />
  );
}
