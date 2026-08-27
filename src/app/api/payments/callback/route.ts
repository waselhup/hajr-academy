import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { adoptMoyasarPayment } from "@/lib/finance/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/callback — Moyasar hosted-form redirect target.
 *
 * Moyasar appends `id` (payment id) and `status`. The hosted form creates
 * the payment client-side, so no local Payment row exists yet —
 * `adoptMoyasarPayment` fetches the payment from Moyasar (authoritative;
 * the query `status` is never trusted), validates it against our own
 * invoice/order, records it and reconciles.
 *
 * Where the payer lands afterwards is decided HERE, from what was actually
 * paid plus the caller's own session — not from query parameters. A card
 * payment can route through 3-D Secure and back through the bank before
 * reaching us, and query parameters do not reliably survive that trip; the
 * first live payment landed a public buyer on the students-only page (and
 * therefore on the login screen) for exactly that reason.
 *
 * This route is necessarily unauthenticated, so it decides nothing about
 * money on its own: every settlement gate lives in
 * reconcileFromMoyasarPayment, which runs on every delivery.
 */

/** Same-origin relative paths only — an allowlist, never a denylist. */
const RELATIVE_PATH = /^\/[A-Za-z0-9\-._~/]*$/;

function safePath(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("//") || !RELATIVE_PATH.test(raw)) return null;
  return raw;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const moyasarId = sp.get("id");
  const queryLocale = sp.get("locale") === "en" ? "en" : null;

  // Optional hints from the payment page; absent after a 3-D Secure detour.
  const successHint = safePath(sp.get("success"));
  const failureHint = safePath(sp.get("failure"));

  const send = (path: string, params: Record<string, string>) => {
    const origin = req.nextUrl.origin;
    let url = new URL(path, origin);
    if (url.origin !== origin) url = new URL("/", origin);
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
    return NextResponse.redirect(url);
  };

  if (!moyasarId) {
    return send(`/${queryLocale ?? "ar"}`, {});
  }

  try {
    const res = await adoptMoyasarPayment(moyasarId);
    const locale = res.locale ?? queryLocale ?? "ar";
    const entityId = res.invoiceId ?? "";

    // A landing-page purchase has no account behind it, so it always returns
    // to a public page — but WHICH page has to depend on whether the card
    // actually went through.
    //
    // Every outcome used to land on /checkout/success, a page headed "تم
    // استلام طلبك" with a "the team will contact you" note. A buyer whose bank
    // had just declined the card read that as done and stopped. One customer
    // was declined three times in half an hour and re-registered under a new
    // name each time, because nothing ever told her the payment had failed.
    //
    // A decline now returns to the payment page, where the amount is already
    // loaded and retrying is one tap. `transient` is the exception: the card
    // WAS charged and only our verification is lagging, so the webhook will
    // settle it — sending that buyer back to "pay" invites a double charge.
    // Only a gateway-confirmed FAILED goes back to "pay". Every other
    // non-settled outcome — a transient verification error, an amount
    // mismatch, a cancelled order — may mean the card WAS charged, and
    // inviting a retry there would risk taking the money twice. Those keep the
    // confirmation page, which reads the real order state and never lies.
    if (res.kind === "order") {
      const declinedByBank = res.ok && res.status === "FAILED";
      return declinedByBank && entityId
        ? send(`/${locale}/checkout/pay/${entityId}`, { failed: "1" })
        : send(`/${locale}/checkout/success`, { order: entityId });
    }

    // An invoice: route by who is actually signed in, since a parent pays a
    // child's invoice from a different section of the app.
    const session = await auth().catch(() => null);
    const role = session?.user?.role;
    const isParent = role === "PARENT";

    const successPath =
      successHint ??
      (isParent
        ? `/${locale}/parent/finance`
        : `/${locale}/student/billing/success`);
    const failurePath =
      failureHint ??
      (isParent
        ? `/${locale}/parent/finance`
        : `/${locale}/student/billing/failure`);

    if (!res.ok) {
      // Charged but unverifiable: never call it a failure — the webhook will
      // settle it, and telling a charged payer "failed" invites a second
      // payment.
      if (res.transient) {
        return send(failurePath, {
          reason: "pending-verification",
          invoice: entityId,
          pending: "1",
        });
      }
      return send(failurePath, {
        reason: res.error ?? "reconciliation-failed",
        invoice: entityId,
      });
    }
    if (res.status === "PAID") {
      return send(successPath, { invoice: entityId });
    }
    // Not settled at the gateway yet (an authorisation hold, or an async
    // method still in flight) — also pending, not failed.
    if (res.status === "INITIATED") {
      return send(failurePath, {
        reason: "pending-verification",
        invoice: entityId,
        pending: "1",
      });
    }
    return send(failurePath, {
      reason: (res.status ?? "unknown").toLowerCase(),
      invoice: entityId,
    });
  } catch (e) {
    console.error("[api/payments/callback] failed:", e);
    return send(`/${queryLocale ?? "ar"}/student/billing/failure`, {
      reason: "pending-verification",
      pending: "1",
    });
  }
}

export const POST = GET;
