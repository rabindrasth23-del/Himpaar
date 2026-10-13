// One interface for every backend call the web app makes.
// Two implementations: `realApi` (fetch against API_URL) and `mockApi` (in-memory sample data).
// `src/api/index.ts` picks one from a single env flag.
import type {
  ApiKey,
  CreateApiKeyInput,
  CreatePaymentLinkRequest,
  CreateWebhookEndpointInput,
  CreatedApiKey,
  CreatedWebhookEndpoint,
  KycInput,
  LoginInput,
  Merchant,
  Payment,
  PaymentLink,
  PublicPaymentLink,
  Session,
  SettlementDocument,
  Settlement,
  SignupInput,
  SimulateInput,
  SimulateResult,
  WebhookDelivery,
  WebhookEndpoint,
} from "@himpaar/shared";

export interface HimpaarApi {
  readonly mode: "mock" | "real";

  // Auth and merchant
  getSession(): Promise<Session | null>;
  login(input: LoginInput): Promise<Session>;
  signup(input: SignupInput): Promise<Session>;
  logout(): Promise<void>;
  submitKyc(input: KycInput): Promise<Merchant>;

  // Payment links
  listPaymentLinks(): Promise<PaymentLink[]>;
  getPaymentLink(id: string): Promise<PaymentLink>;
  createPaymentLink(input: CreatePaymentLinkRequest, idempotencyKey: string): Promise<PaymentLink>;

  // Payments, settlements, documents
  listPayments(): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment>;
  listSettlements(): Promise<Settlement[]>;
  getSettlement(id: string): Promise<Settlement>;
  listDocuments(): Promise<SettlementDocument[]>;
  getDocument(id: string): Promise<SettlementDocument>;

  // Developers
  listApiKeys(): Promise<ApiKey[]>;
  createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey>;
  revokeApiKey(id: string): Promise<void>;
  listWebhookEndpoints(): Promise<WebhookEndpoint[]>;
  createWebhookEndpoint(input: CreateWebhookEndpointInput): Promise<CreatedWebhookEndpoint>;
  deleteWebhookEndpoint(id: string): Promise<void>;
  listWebhookDeliveries(): Promise<WebhookDelivery[]>;
  redeliverWebhook(id: string): Promise<WebhookDelivery>;

  // Public payer page
  getPublicPaymentLink(token: string): Promise<PublicPaymentLink>;
  simulatePayment(token: string, input: SimulateInput, eventId: string): Promise<SimulateResult>;

  // Sandbox controls (no API routes yet; mock only)
  sandboxCompletePending(paymentId: string): Promise<Payment>;
  sandboxAdvanceSettlement(settlementId: string): Promise<Settlement>;
  sandboxReplayWebhook(deliveryId: string): Promise<{ duplicate: true; delivery: WebhookDelivery }>;
}

/** Error carrying the API's error shape (TRD §7). */
export class HimpaarApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly details: Record<string, unknown> | null;

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    requestId?: string | null;
    details?: Record<string, unknown> | null;
  }) {
    super(opts.message);
    this.name = "HimpaarApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.requestId = opts.requestId ?? null;
    this.details = opts.details ?? null;
  }
}
