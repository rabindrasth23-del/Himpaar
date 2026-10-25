// Real API client: fetch against API_URL (TRD §7, all routes under /v1).
// Every response is validated with the shared Zod schemas before the UI sees it.
import {
  ApiErrorSchema,
  ApiKeySchema,
  CreatedApiKeySchema,
  CreatedWebhookEndpointSchema,
  DocumentSchema,
  MerchantSchema,
  PaymentLinkSchema,
  PaymentSchema,
  PublicPaymentLinkSchema,
  SessionSchema,
  SettlementSchema,
  SimulateResultSchema,
  WebhookDeliverySchema,
  WebhookEndpointSchema,
  listOf,
} from "@himpaar/shared";
import type { z } from "zod";
import { HimpaarApiError, type HimpaarApi } from "./types.ts";

type Method = "GET" | "POST" | "DELETE";

export function createRealApi(baseUrl: string): HimpaarApi {
  async function request(method: Method, path: string, schema: null, body?: unknown, headers?: Record<string, string>): Promise<void>;
  async function request<S extends z.ZodType>(method: Method, path: string, schema: S, body?: unknown, headers?: Record<string, string>): Promise<z.infer<S>>;
  async function request<S extends z.ZodType>(
    method: Method,
    path: string,
    schema: S | null,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<z.infer<S> | void> {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method,
      credentials: "include", // session cookie (same-origin in production)
      headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const json: unknown = await res.json().catch(() => null);
      const parsed = ApiErrorSchema.safeParse(json);
      if (parsed.success) {
        const e = parsed.data.error;
        throw new HimpaarApiError({
          code: e.code,
          message: e.message,
          status: res.status,
          requestId: e.request_id,
          details: e.details,
        });
      }
      throw new HimpaarApiError({ code: "HTTP_ERROR", message: `Request failed (${res.status})`, status: res.status });
    }

    if (schema === null || res.status === 204) return;
    return schema.parse(await res.json());
  }

  const notYet = (what: string) =>
    Promise.reject(
      new HimpaarApiError({ code: "NOT_IMPLEMENTED", message: `${what} is not available in the API yet`, status: 501 }),
    );

  return {
    mode: "real",

    async getSession() {
      try {
        return await request("GET", "/auth/me", SessionSchema);
      } catch (e) {
        if (e instanceof HimpaarApiError && e.status === 401) return null;
        throw e;
      }
    },
    login: (input) => request("POST", "/auth/login", SessionSchema, input),
    signup: (input) => request("POST", "/auth/signup", SessionSchema, input),
    logout: () => request("POST", "/auth/logout", null, {}),
    submitKyc: (input) => request("POST", "/kyc", MerchantSchema, input),

    listPaymentLinks: async () => (await request("GET", "/payment-links", listOf(PaymentLinkSchema))).data,
    getPaymentLink: (id) => request("GET", `/payment-links/${encodeURIComponent(id)}`, PaymentLinkSchema),
    createPaymentLink: (input, idempotencyKey) =>
      request("POST", "/payment-links", PaymentLinkSchema, input, { "Idempotency-Key": idempotencyKey }),

    listPayments: async () => (await request("GET", "/payments", listOf(PaymentSchema))).data,
    getPayment: (id) => request("GET", `/payments/${encodeURIComponent(id)}`, PaymentSchema),
    listSettlements: async () => (await request("GET", "/settlements", listOf(SettlementSchema))).data,
    getSettlement: (id) => request("GET", `/settlements/${encodeURIComponent(id)}`, SettlementSchema),
    listDocuments: async () => (await request("GET", "/documents", listOf(DocumentSchema))).data,
    getDocument: (id) => request("GET", `/documents/${encodeURIComponent(id)}`, DocumentSchema),

    listApiKeys: async () => (await request("GET", "/api-keys", listOf(ApiKeySchema))).data,
    createApiKey: (input) => request("POST", "/api-keys", CreatedApiKeySchema, input),
    revokeApiKey: (id) => request("DELETE", `/api-keys/${encodeURIComponent(id)}`, null),
    listWebhookEndpoints: async () => (await request("GET", "/webhook-endpoints", listOf(WebhookEndpointSchema))).data,
    createWebhookEndpoint: (input) => request("POST", "/webhook-endpoints", CreatedWebhookEndpointSchema, input),
    deleteWebhookEndpoint: (id) => request("DELETE", `/webhook-endpoints/${encodeURIComponent(id)}`, null),
    listWebhookDeliveries: async () =>
      (await request("GET", "/webhook-deliveries", listOf(WebhookDeliverySchema))).data,
    redeliverWebhook: (id) =>
      request("POST", `/webhook-deliveries/${encodeURIComponent(id)}/redeliver`, WebhookDeliverySchema, {}),

    getPublicPaymentLink: (token) =>
      request("GET", `/public/payment-links/${encodeURIComponent(token)}`, PublicPaymentLinkSchema),
    // The simulate endpoint dedupes on the bank event id (TRD §7), sent in the body.
    simulatePayment: (token, input, eventId) =>
      request("POST", `/public/payment-links/${encodeURIComponent(token)}/simulate`, SimulateResultSchema, {
        ...input,
        event_id: eventId,
      }),

    sandboxCompletePending: () => notYet("Completing a pending payment"),
    sandboxAdvanceSettlement: () => notYet("Advancing a settlement"),
    sandboxReplayWebhook: () => notYet("Replaying a webhook"),

    // Admin console: backend routes (/v1/admin/*) not built yet.
    getAdminSession: async () => null,
    adminLogin: () => notYet("Admin login"),
    adminLogout: async () => {},
    adminOverview: () => notYet("Admin overview"),
    adminListMerchants: () => notYet("Admin merchants"),
    adminListUsers: () => notYet("Admin users"),
    adminGetMerchant: () => notYet("Admin merchant detail"),
    adminSetKycStatus: () => notYet("Changing KYC status"),
    adminSetSuspended: () => notYet("Suspending merchants"),
    adminListPayments: () => notYet("Admin payments"),
    adminListSettlements: () => notYet("Admin settlements"),
    adminMarkSettlementPaid: () => notYet("Marking settlements paid"),
    adminListAudit: () => notYet("Admin activity log"),
  };
}
