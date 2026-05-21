/**
 * Scheduled communication checks, run by /api/cron/comms-tick every 5 min.
 *
 *  - Class sessions starting in ~30 min → class reminder
 *  - Invoices that became overdue (1+ days) → payment-overdue reminder
 *
 * Each check is idempotent within reason: reminders use a time window so a
 * session is only caught in one tick, and overdue invoices flip to OVERDUE
 * status so they are not reminded twice on the same day.
 */
import { prisma } from "@/lib/prisma";
import { triggerClassReminder, triggerPaymentOverdue } from "./triggers";

export interface CronSummary {
  classReminders: number;
  overdueReminders: number;
  errors: string[];
}

/** Run all scheduled communication checks and return a summary. */
export async function runCommsTick(): Promise<CronSummary> {
  const summary: CronSummary = {
    classReminders: 0,
    overdueReminders: 0,
    errors: [],
  };

  // ── Class reminders: sessions starting in the next 30–35 min window ──
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 30 * 60_000);
    const windowEnd = new Date(now.getTime() + 35 * 60_000);
    const sessions = await prisma.classSession.findMany({
      where: {
        status: "SCHEDULED",
        scheduledDate: { gte: windowStart, lt: windowEnd },
      },
      select: { id: true },
    });
    for (const s of sessions) {
      try {
        await triggerClassReminder(s.id);
        summary.classReminders++;
      } catch (e) {
        summary.errors.push(
          `classReminder ${s.id}: ${e instanceof Error ? e.message : "failed"}`
        );
      }
    }
  } catch (e) {
    summary.errors.push(
      `classReminders scan: ${e instanceof Error ? e.message : "failed"}`
    );
  }

  // ── Overdue invoices: PENDING invoices past their due date ──
  try {
    const now = new Date();
    const overdue = await prisma.invoice.findMany({
      where: { status: "PENDING", dueDate: { lt: now } },
      select: { id: true, dueDate: true },
    });
    for (const inv of overdue) {
      try {
        const daysOverdue = Math.max(
          1,
          Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400_000)
        );
        // Flip status so we don't re-remind every tick.
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { status: "OVERDUE" },
        });
        await triggerPaymentOverdue(inv.id, daysOverdue);
        summary.overdueReminders++;
      } catch (e) {
        summary.errors.push(
          `overdue ${inv.id}: ${e instanceof Error ? e.message : "failed"}`
        );
      }
    }
  } catch (e) {
    summary.errors.push(
      `overdue scan: ${e instanceof Error ? e.message : "failed"}`
    );
  }

  return summary;
}
