import { NextRequest, NextResponse } from "next/server";
import { adoptMoyasarPayment } from "@/lib/finance/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/callback — Moyasar hosted-form redirect target.
 *
 * Moyasar appends `id` (payment id) and `status` to the callback URL. The
 * hosted form creates the payment client-side, so no local Payment row
 * exists yet — `adoptMoyasarPayment` fetches the payment from Moyasar
 * (authoritative — the query `status` is never trusted), validates the
 * amount against the invoice, records it locally and reconciles. The user
 * is then forwarded to the caller-supplied success/failure page, which must
 * be a same-origin relative path.
 *
 * This route is necessarily unauthenticated (Moyasar redirects the browser
 * here), so it decides nothing on its own: every settlement gate lives in
 * reconcileFromMoyasarPayment, which runs on every delivery.
 */

/**
 * Only allow same-origin relative redirect targets.
 *
 * An allowlist rather than a denylist: the WHATWG URL parser strips
 * tab/CR/LF anywhere in the input, so "/<tab>/evil.com" would survive a
 * naive startsWith("//") check and then re-parse as protocol-relative.
 * Our own paths are plain ASCII route segments, so anything else is
 * rejected outright — and the caller re-checks the final origin too.
 */
const RELATIVE_PATH = /^\/[A-Za-z0-9\-._~/]*$/;

function safePath(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("//") || !RELATIVE_PATH.test(raw)) return null;
  return raw;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const moyasarId = sp.get("id");
  const locale = sp.get("locale") === "en" ? "en" : "ar";
  const successPath = safePath(sp.get("success"));
  const failurePath = safePath(sp.get("failure"));

  const redirectTo = (
    path: string,
    params: Record<string, string>
  ): NextResponse => {
    const origin = req.nextUrl.origin;
    let url = new URL(path, origin);
    // Belt and braces: never leave our own origin, whatever the input was.
    if (url.origin !== origin) {
      url = new URL(`/${locale}/student/billing`, origin);
    }
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
    return NextResponse.redirect(url);
  };

  const fail = (reason: string, invoiceId?: string) =>
    redirectTo(failurePath ?? `/${locale}/student/billing/failure`, {
      reason,
      invoice: invoiceId ?? "",
    });
  // Charged but unverified (gateway/DB unreachable, or not settled yet):
  // never call this a failure — the webhook will settle it, so tell the
  // payer it is pending.
  const pending = (invoiceId?: string) =>
    redirectTo(failurePath ?? `/${locale}/student/billing/failure`, {
      reason: "pending-verification",
      invoice: invoiceId ?? "",
      pending: "1",
    });
  const succeed = (invoiceId: string) =>
    redirectTo(successPath ?? `/${locale}/student/billing/success`, {
      invoice: invoiceId,
    });

  if (!moyasarId) return fail("missing-payment-id");

  try {
    const res = await adoptMoyasarPayment(moyasarId);
    if (!res.ok) {
      if (res.transient) return pending(res.invoiceId);
      return fail(res.error ?? "reconciliation-failed", res.invoiceId);
    }
    if (res.status === "PAID") {
      return succeed(res.invoiceId!);
    }
    // INITIATED = the gateway has not settled it yet (an authorisation hold,
    // or an async method still in flight) — also a pending state.
    if (res.status === "INITIATED") return pending(res.invoiceId);
    return fail((res.status ?? "unknown").toLowerCase(), res.invoiceId);
  } catch (e) {
    console.error("[api/payments/callback] failed:", e);
    return pending();
  }
}

export const POST = GET;
