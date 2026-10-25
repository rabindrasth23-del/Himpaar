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
  KycStatus,
  LoginInput,
  Merchant,
  Money,
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

  // Admin console (/admin). Separate session from merchants.
  getAdminSession(): Promise<AdminSession | null>;
  adminLogin(input: LoginInput): Promise<AdminSession>;
  adminLogout(): Promise<void>;
  adminOverview(): Promise<AdminOverview>;
  adminListMerchants(): Promise<AdminMerchant[]>;
  adminListUsers(): Promise<AdminUser[]>;
  adminGetMerchant(id: string): Promise<AdminMerchantDetail>;
  adminSetKycStatus(id: string, status: KycStatus): Promise<AdminMerchant>;
  adminSetSuspended(id: string, suspended: boolean, reason: string): Promise<AdminMerchant>;
  adminListPayments(): Promise<Payment[]>;
  adminListSettlements(): Promise<Settlement[]>;
  adminMarkSettlementPaid(id: string): Promise<Settlement>;
  adminListAudit(): Promise<AdminAuditEntry[]>;
}

/* ── Admin console types ─────────────────────────────────────── */
export interface AdminSession {
  admin: { id: string; email: string; name: string };
}

export interface AdminMerchant extends Merchant {
  suspended: boolean;
  owner_email: string | null;
  user_count: number;
}

export interface AdminAuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target_type: "merchant" | "settlement" | "session" | "user";
  target_id: string | null;
  summary: string;
}

export interface AdminUser {
  id: string;
  email: string;
  merchant_id: string;
  merchant_name: string;
  kyc_status: KycStatus;
  suspended: boolean;
  created_at: string | null;
  last_login_at: string | null;
  login_count: number;
}

export interface AdminMerchantDetail {
  merchant: AdminMerchant;
  users: { id: string; email: string }[];
  audit: AdminAuditEntry[];
}

export interface AdminOverview {
  merchants_total: number;
  merchants_pending_kyc: number;
  merchants_suspended: number;
  payments_succeeded: number;
  payments_pending: number;
  payments_failed: number;
  gross_volume: Money;
  fees_earned: Money;
  settlements_pending: number;
  settlements_pending_npr: Money;
  recent_merchants: AdminMerchant[];
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
