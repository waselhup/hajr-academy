/**
 * Scheduled finance checks, run from /api/cron/comms-tick.
 *
 *  - Subscription renewals: ACTIVE subs whose nextBillingDate has passed
 *    get a fresh invoice; if a card is on file an auto-charge is attempted.
 *  - Auto-charge failure → subscription PAST_DUE + payment-failed notice.
 *  - PAST_DUE longer than the grace period → EXPIRED, access revoked.
 *  - Renewal heads-up: subs renewing in ~3 days → a reminder.
 *
 * Each step is defensive and idempotent within a day: a generated invoice
 * advances nextBillingDate so a sub is not billed twice in one window.
 */

import { prisma } from "@/lib/prisma";
import {
  generateRenewalInvoice,
  setSubscriptionStatus,
  GRACE_PERIOD_DAYS,
} from "./subscriptions";
import { initiatePayment } from "./payments";
import {
  triggerInvoiceCreated,
  triggerSubscriptionExpiring,
} from "@/lib/comms/triggers";

export interface FinanceCronSummary {
  renewalsBilled: number;
  autoCharged: number;
  autoChargeFailed: number;
  expired: number;
  renewalReminders: number;
  errors: string[];
}

export async function runFinanceTick(): Promise<FinanceCronSummary> {
  const summary: FinanceCronSummary = {
    renewalsBilled: 0,
    autoCharged: 0,
    autoChargeFailed: 0,
    expired: 0,
    renewalReminders: 0,
    errors: [],
  };
  const now = new Date();

  // ── 1. Renewals due ────────────────────────────────────────────────
  try {
    const due = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextBillingDate: { lte: now, not: null },
      },
      select: { id: true, autoRenew: true, paymentMethodId: true },
    });

    for (const sub of due) {
      try {
        const invoiceId = await generateRenewalInvoice(sub.id);
        if (!invoiceId) continue;
        summary.renewalsBilled++;

        // Notify the student the invoice exists.
        try {
          await triggerInvoiceCreated(invoiceId);
        } catch {
          /* notification failure must not block billing */
        }

        // Auto-charge only when the student opted in AND a card is stored.
        if (sub.autoRenew && sub.paymentMethodId) {
          const charge = await initiatePayment({
            invoiceId,
            source: {
              type: "token",
              token: sub.paymentMethodId,
            },
            callbackUrl: "/api/payments/callback",
          });
          if (charge.ok && (charge.status === "paid" || charge.alreadyPaid)) {
            summary.autoCharged++;
          } else {
            summary.autoChargeFailed++;
            // Charge failed → mark the subscription PAST_DUE.
            await setSubscriptionStatus(sub.id, "PAST_DUE");
          }
        }
      } catch (e) {
        summary.errors.push(
          `renewal ${sub.id}: ${e instanceof Error ? e.message : "failed"}`
        );
      }
    }
  } catch (e) {
    summary.errors.push(
      `renewals scan: ${e instanceof Error ? e.message : "failed"}`
    );
  }

  // ── 2. Expire long-overdue subscriptions ──────────────────────────
  try {
    const cutoff = new Date(now.getTime() - GRACE_PERIOD_DAYS * 86400_000);
    const stale = await prisma.subscription.findMany({
      where: {
        status: "PAST_DUE",
        currentPeriodEnd: { lt: cutoff },
      },
      select: { id: true, studentId: true },
    });
    for (const sub of stale) {
      try {
        await setSubscriptionStatus(sub.id, "EXPIRED");
        // Revoke the active package on the student profile.
        await prisma.studentProfile.update({
          where: { id: sub.studentId },
          data: { activePackage: null },
        });
        summary.expired++;
      } catch (e) {
        summary.errors.push(
          `expire ${sub.id}: ${e instanceof Error ? e.message : "failed"}`
        );
      }
    }
  } catch (e) {
    summary.errors.push(
      `expire scan: ${e instanceof Error ? e.message : "failed"}`
    );
  }

  // ── 3. Renewal reminders (~3 days out) ────────────────────────────
  try {
    const windowStart = new Date(now.getTime() + 3 * 86400_000);
    const windowEnd = new Date(now.getTime() + 3.5 * 86400_000);
    const upcoming = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        autoRenew: true,
        currentPeriodEnd: { gte: windowStart, lt: windowEnd },
      },
      select: { id: true },
    });
    for (const sub of upcoming) {
      try {
        await triggerSubscriptionExpiring(sub.id, 3);
        summary.renewalReminders++;
      } catch (e) {
        summary.errors.push(
          `renewalReminder ${sub.id}: ${e instanceof Error ? e.message : "failed"}`
        );
      }
    }
  } catch (e) {
    summary.errors.push(
      `renewalReminder scan: ${e instanceof Error ? e.message : "failed"}`
    );
  }

  return summary;
}
