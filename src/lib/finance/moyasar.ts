/**
 * Moyasar payment-gateway client (Phase 8).
 *
 * Wraps the Moyasar REST API (https://api.moyasar.com/v1). The Moyasar
 * Node SDK is not used — the REST surface is small and fetch-based access
 * keeps the dependency footprint minimal.
 *
 * Mock mode: when `MOYASAR_SECRET_KEY` is unset every call returns a
 * deterministic fake "paid" response so the whole billing flow can be
 * exercised in development and CI without real credentials.
 *
 * All amounts crossing the Moyasar boundary are in **halalas**
 * (1 SAR = 100 halalas). The rest of the app works in SAR — use
 * `sarToHalalas` / `halalasToSar` at the boundary.
 */

const MOYASAR_BASE = "https://api.moyasar.com/v1";

/**
 * Production = the live site. Mock mode is a development affordance and must
 * never activate here: a missing key in production is a hard error, never a
 * synthesised "paid" response.
 */
export function isProductionEnv(): boolean {
  // ANY deployed environment counts — preview/branch deployments run against
  // the same live database, so mock mode there would mint free PAID invoices
  // just as surely as on the production domain. Mock is for localhost only.
  return !!process.env.VERCEL || process.env.NODE_ENV === "production";
}

/** 250.00 SAR → 25000 halalas. */
export function sarToHalalas(sar: number): number {
  return Math.round(sar * 100);
}

/** 25000 halalas → 250.00 SAR. */
export function halalasToSar(halalas: number): number {
  return Math.round(halalas) / 100;
}

export type MoyasarPaymentStatus =
  | "initiated"
  | "paid"
  | "failed"
  | "authorized"
  | "captured"
  | "refunded"
  | "voided";

export interface MoyasarSource {
  type: string;
  company?: string; // card brand: visa | master | mada | ...
  name?: string;
  number?: string; // masked, e.g. "4111-11XX-XXXX-1111"
  message?: string;
  transaction_url?: string;
  [key: string]: unknown;
}

export interface MoyasarPayment {
  id: string;
  status: MoyasarPaymentStatus;
  amount: number; // halalas
  fee: number;
  currency: string;
  refunded: number;
  refunded_at: string | null;
  captured: number;
  captured_at: string | null;
  voided_at: string | null;
  description: string | null;
  amount_format: string;
  invoice_id: string | null;
  ip: string | null;
  callback_url: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string> | null;
  source: MoyasarSource;
  /** Set by this client when the response is a mock (no API key). */
  mock?: boolean;
}

export interface CreatePaymentParams {
  /** Amount in halalas. */
  amount: number;
  currency?: string;
  description: string;
  callbackUrl: string;
  source: { type: string; [key: string]: unknown };
  metadata?: Record<string, string>;
}

export interface MoyasarResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  /** True when the result was synthesised in mock mode. */
  mock: boolean;
}

export class MoyasarClient {
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey ?? process.env.MOYASAR_SECRET_KEY ?? "";
  }

  /**
   * When true, no real API calls are made — responses are synthesised.
   * Never true in production: there, a missing key fails closed instead
   * (see `notConfigured`), so nothing can be marked paid for free.
   */
  get isMockMode(): boolean {
    return !this.secretKey && !isProductionEnv();
  }

  /** Live site with no secret key — every call must fail, never synthesise. */
  private get failClosed(): boolean {
    return !this.secretKey && isProductionEnv();
  }

  private notConfigured<T>(): MoyasarResult<T> {
    console.error("[moyasar] MOYASAR_SECRET_KEY missing in production");
    return {
      ok: false,
      error: "Payment gateway is not configured.",
      mock: false,
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  /** Synthesise a paid mock payment for development without credentials. */
  private mockPayment(
    params: Partial<CreatePaymentParams> & { id?: string; status?: MoyasarPaymentStatus }
  ): MoyasarPayment {
    const id = params.id ?? `mock_pay_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const status = params.status ?? "paid";
    const amount = params.amount ?? 0;
    return {
      id,
      status,
      amount,
      fee: 0,
      currency: params.currency ?? "SAR",
      refunded: 0,
      refunded_at: null,
      captured: status === "paid" ? amount : 0,
      captured_at: status === "paid" ? now : null,
      voided_at: null,
      description: params.description ?? null,
      amount_format: `${(amount / 100).toFixed(2)} SAR`,
      invoice_id: null,
      ip: null,
      callback_url: params.callbackUrl ?? null,
      created_at: now,
      updated_at: now,
      metadata: params.metadata ?? null,
      source: {
        type: params.source?.type ?? "creditcard",
        company: "mada",
        name: "Test Cardholder",
        number: "4111-11XX-XXXX-1111",
        message: "Mock payment — no API key configured.",
      },
      mock: true,
    };
  }

  /** Create a payment. In mock mode returns a synthesised paid payment. */
  async createPayment(
    params: CreatePaymentParams
  ): Promise<MoyasarResult<MoyasarPayment>> {
    if (this.failClosed) return this.notConfigured<MoyasarPayment>();
    if (this.isMockMode) {
      const data = this.mockPayment(params);
      console.log("[moyasar:mock] createPayment", {
        amount: params.amount,
        description: params.description,
        id: data.id,
      });
      return { ok: true, data, mock: true };
    }

    try {
      const res = await fetch(`${MOYASAR_BASE}/payments`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency ?? "SAR",
          description: params.description,
          callback_url: params.callbackUrl,
          source: params.source,
          metadata: params.metadata,
        }),
      });
      const json = (await res.json()) as MoyasarPayment & { message?: string };
      if (!res.ok) {
        return {
          ok: false,
          error: json.message ?? `Moyasar error ${res.status}`,
          mock: false,
        };
      }
      return { ok: true, data: json, mock: false };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Moyasar request failed",
        mock: false,
      };
    }
  }

  /** Fetch a payment's current status. */
  async getPayment(paymentId: string): Promise<MoyasarResult<MoyasarPayment>> {
    if (this.failClosed) return this.notConfigured<MoyasarPayment>();
    // The `mock_` shortcut is honoured only while actually in mock mode —
    // with a live key a `mock_…` id (every pre-launch row has one) must not
    // resolve to a synthetic "paid" payment.
    if (this.isMockMode || (!this.secretKey && paymentId.startsWith("mock_"))) {
      const data = this.mockPayment({ id: paymentId, status: "paid" });
      console.log("[moyasar:mock] getPayment", paymentId);
      return { ok: true, data, mock: true };
    }

    try {
      const res = await fetch(`${MOYASAR_BASE}/payments/${paymentId}`, {
        method: "GET",
        headers: this.headers,
      });
      const json = (await res.json()) as MoyasarPayment & { message?: string };
      if (!res.ok) {
        return {
          ok: false,
          error: json.message ?? `Moyasar error ${res.status}`,
          mock: false,
        };
      }
      return { ok: true, data: json, mock: false };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Moyasar request failed",
        mock: false,
      };
    }
  }

  /**
   * Refund a payment, fully or partially.
   * @param amount Optional partial amount in halalas; omit for a full refund.
   */
  async refundPayment(
    paymentId: string,
    amount?: number
  ): Promise<MoyasarResult<MoyasarPayment>> {
    if (this.failClosed) return this.notConfigured<MoyasarPayment>();
    if (this.isMockMode || (!this.secretKey && paymentId.startsWith("mock_"))) {
      const base = this.mockPayment({ id: paymentId, status: "refunded" });
      const refunded = amount ?? base.amount;
      console.log("[moyasar:mock] refundPayment", { paymentId, amount: refunded });
      return {
        ok: true,
        data: {
          ...base,
          status: refunded >= base.amount ? "refunded" : "paid",
          refunded,
          refunded_at: new Date().toISOString(),
        },
        mock: true,
      };
    }

    try {
      const res = await fetch(`${MOYASAR_BASE}/payments/${paymentId}/refund`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(amount != null ? { amount } : {}),
      });
      const json = (await res.json()) as MoyasarPayment & { message?: string };
      if (!res.ok) {
        return {
          ok: false,
          error: json.message ?? `Moyasar refund error ${res.status}`,
          mock: false,
        };
      }
      return { ok: true, data: json, mock: false };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Moyasar refund failed",
        mock: false,
      };
    }
  }

  /** List payments with optional pagination / date filter. */
  async listPayments(params: {
    page?: number;
    created_after?: string;
    created_before?: string;
  }): Promise<MoyasarResult<{ payments: MoyasarPayment[]; meta: unknown }>> {
    if (this.failClosed) {
      return this.notConfigured<{ payments: MoyasarPayment[]; meta: unknown }>();
    }
    if (this.isMockMode) {
      console.log("[moyasar:mock] listPayments", params);
      return { ok: true, data: { payments: [], meta: { mock: true } }, mock: true };
    }

    try {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.created_after) qs.set("created[gt]", params.created_after);
      if (params.created_before) qs.set("created[lt]", params.created_before);
      const res = await fetch(`${MOYASAR_BASE}/payments?${qs.toString()}`, {
        method: "GET",
        headers: this.headers,
      });
      const json = (await res.json()) as {
        payments: MoyasarPayment[];
        meta: unknown;
        message?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          error: json.message ?? `Moyasar error ${res.status}`,
          mock: false,
        };
      }
      return { ok: true, data: { payments: json.payments, meta: json.meta }, mock: false };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Moyasar request failed",
        mock: false,
      };
    }
  }
}

/**
 * Verify a Moyasar webhook against the configured shared secret.
 *
 * Moyasar webhooks carry a `secret_token` field in the JSON body that must
 * equal `MOYASAR_WEBHOOK_SECRET`. Locally (no secret configured) the check
 * is skipped so the flow can be exercised; in production it fails CLOSED —
 * the webhook mutates invoice state, so an unauthenticated caller must
 * never reach it.
 */
export function verifyMoyasarWebhook(payload: {
  secret_token?: string;
}): { valid: boolean; reason?: string } {
  const expected = process.env.MOYASAR_WEBHOOK_SECRET ?? "";
  if (!expected) {
    if (isProductionEnv()) {
      return { valid: false, reason: "webhook-secret-not-configured" };
    }
    return { valid: true, reason: "no-secret-configured" };
  }
  if (payload.secret_token && payload.secret_token === expected) {
    return { valid: true };
  }
  return { valid: false, reason: "secret-token-mismatch" };
}

/**
 * Map a Moyasar payment status to our Prisma `PayStatus`.
 *
 * `authorized` is deliberately NOT paid: it is an authorisation hold with
 * no funds captured, and it expires. Only a captured/paid payment settles
 * an invoice.
 */
export function mapMoyasarStatus(
  status: MoyasarPaymentStatus,
  refunded: number,
  amount: number
): "INITIATED" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" {
  const settled = status === "paid" || status === "captured";
  if (status === "refunded" || (settled && refunded >= amount && amount > 0)) {
    return "REFUNDED";
  }
  // A partial refund only makes sense on top of a settled payment — check it
  // AFTER settlement so a paid-then-partially-refunded charge is still
  // recognised as having settled its invoice.
  if (settled && refunded > 0 && refunded < amount) return "PARTIALLY_REFUNDED";
  if (settled) return "PAID";
  if (refunded > 0 && refunded < amount) return "PARTIALLY_REFUNDED";
  if (status === "failed" || status === "voided") return "FAILED";
  return "INITIATED";
}

/** Extract masked card brand + last-4 from a Moyasar source. */
export function extractCardInfo(source: MoyasarSource): {
  cardBrand: string | null;
  cardLast4: string | null;
} {
  const cardBrand = (source.company as string | undefined) ?? null;
  const number = (source.number as string | undefined) ?? "";
  const digits = number.replace(/\D/g, "");
  const cardLast4 = digits.length >= 4 ? digits.slice(-4) : null;
  return { cardBrand, cardLast4 };
}

/** Singleton client bound to the process environment. */
export const moyasar = new MoyasarClient();

/**
 * What the SERVER can actually do with payments right now — computed on the
 * server and handed to the payment form, because the publishable key alone
 * cannot tell the browser whether the server will be able to verify the
 * charge it is about to make.
 *
 *   live          both halves configured — take real payments
 *   mock          development, neither half configured — simulate
 *   misconfigured the halves disagree — refuse to take money
 */
export function gatewayMode(): "live" | "mock" | "misconfigured" {
  const secret = process.env.MOYASAR_SECRET_KEY ?? "";
  const publishable = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? "";
  if (secret && publishable) {
    // Both halves must belong to the SAME Moyasar environment: a live
    // publishable key with a test secret would charge real cards and then
    // fail every server-side verification.
    const secretLive = secret.startsWith("sk_live_");
    const publishableLive = publishable.startsWith("pk_live_");
    if (secretLive !== publishableLive) return "misconfigured";
    return "live";
  }
  if (!secret && !publishable && !isProductionEnv()) return "mock";
  return "misconfigured";
}
