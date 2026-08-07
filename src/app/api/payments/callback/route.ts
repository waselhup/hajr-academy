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

    // A landing-page purchase has no account behind it — always the public
    // confirmation page, which reads the real order state.
    if (res.kind === "order") {
      return send(`/${locale}/checkout/success`, { order: entityId });
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
