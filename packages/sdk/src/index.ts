/**
 * @himpaar/sdk — TypeScript SDK for Himpaar payment integration.
 *
 * Usage:
 * ```ts
 * import { HimpaarClient, verifyWebhook } from "@himpaar/sdk";
 *
 * const himpaar = new HimpaarClient({
 *   apiKey: "hp_test_...",
 *   baseUrl: "http://localhost:4000",
 * });
 *
 * const link = await himpaar.createPaymentLink({
 *   amount: { amount_minor: "50000", currency: "USD" },
 *   description: "Project milestone 1",
 *   client_name: "Acme Inc",
 *   client_email: "billing@acme.com",
 *   due_date: "2026-11-01",
 * });
 *
 * // Verify incoming webhook
 * const isValid = verifyWebhook({
 *   secret: "whsec_...",
 *   headers: req.headers,
 *   body: rawBody,
 * });
 * ```
 */

import { PaymentLinkSchema, type PaymentLink, type CreatePaymentLinkRequest } from "@himpaar/shared";

// ── Client ──────────────────────────────────────────────────────────────

export interface HimpaarClientOptions {
  /** API key starting with `hp_test_` (sandbox) or `hp_live_` (future). */
  apiKey: string;
  /** Base URL of the Himpaar API, e.g. `https://api.himpaar.com`. */
  baseUrl: string;
}

export class HimpaarClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts: HimpaarClientOptions) {
    if (!opts.apiKey) throw new Error("apiKey is required");
    if (!opts.baseUrl) throw new Error("baseUrl is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
  }

  /**
   * Create a payment link.
   *
   * Requires an idempotency key. If the same key is sent twice, the original
   * response is returned (no duplicate link is created).
   */
  async createPaymentLink(
    input: CreatePaymentLinkRequest,
    idempotencyKey: string,
  ): Promise<PaymentLink> {
    const res = await fetch(`${this.baseUrl}/v1/payment-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HimpaarApiError(res.status, body);
    }

    return PaymentLinkSchema.parse(await res.json());
  }

  /**
   * List all payment links for this merchant.
   */
  async listPaymentLinks(): Promise<PaymentLink[]> {
    const res = await fetch(`${this.baseUrl}/v1/payment-links`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HimpaarApiError(res.status, body);
    }

    const json = await res.json();
    return (json.data as unknown[]).map((item) => PaymentLinkSchema.parse(item));
  }
}

export class HimpaarApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Himpaar API error ${status}: ${body.slice(0, 200)}`);
    this.name = "HimpaarApiError";
    this.status = status;
    this.body = body;
  }
}

// ── Webhook verification ────────────────────────────────────────────────

export interface VerifyWebhookOptions {
  /** The webhook endpoint's signing secret (starts with `whsec_`). */
  secret: string;
  /** The raw request headers. Must contain `webhook-id`, `webhook-timestamp`, `webhook-signature`. */
  headers: Record<string, string | string[] | undefined>;
  /** The raw request body as a string. */
  body: string;
}

/**
 * Verify a Standard Webhook signature.
 *
 * Uses the `standardwebhooks` library (MIT). Returns `true` if valid.
 * Throws on invalid signature, expired timestamp, or replay.
 *
 * @example
 * ```ts
 * import { verifyWebhook } from "@himpaar/sdk";
 *
 * app.post("/webhooks/himpaar", (req, res) => {
 *   try {
 *     verifyWebhook({
 *       secret: process.env.HIMPAAR_WEBHOOK_SECRET,
 *       headers: req.headers,
 *       body: req.rawBody,
 *     });
 *     // process the webhook
 *     res.sendStatus(200);
 *   } catch {
 *     res.sendStatus(400);
 *   }
 * });
 * ```
 */
export async function verifyWebhook(opts: VerifyWebhookOptions): Promise<boolean> {
  const { Webhook } = await import("standardwebhooks");

  const wh = new Webhook(opts.secret);

  const msgId = headerStr(opts.headers["webhook-id"]);
  const timestampStr = headerStr(opts.headers["webhook-timestamp"]);
  const signature = headerStr(opts.headers["webhook-signature"]);

  if (!msgId || !timestampStr || !signature) {
    throw new Error("Missing required webhook headers (webhook-id, webhook-timestamp, webhook-signature)");
  }

  // Throws on invalid signature or expired timestamp
  wh.verify(opts.body, {
    "webhook-id": msgId,
    "webhook-timestamp": timestampStr,
    "webhook-signature": signature,
  });

  // If verify didn't throw, the signature is valid
  return true;
}

/** Extract a single string from a header value. */
function headerStr(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

// Re-export shared types for SDK users
export type { PaymentLink, CreatePaymentLinkRequest } from "@himpaar/shared";
