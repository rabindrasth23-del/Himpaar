// Shared Zod schemas for the dashboard, payer page and API (TRD sections 4, 6, 7, 11).
// Field names are snake_case to match the API's JSON. Timestamps are ISO 8601 strings.
import { z } from "zod";
import { MoneySchema, MinorUnitsSchema } from "./money.js";

const Iso = z.string(); // ISO 8601 timestamp
const IsoOrNull = Iso.nullable();
const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/* ── Errors (TRD §7) ─────────────────────────────────────────── */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).nullable(),
    request_id: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Generic list envelope. */
export const listOf = <T extends z.ZodType>(item: T) => z.object({ data: z.array(item) });

/* ── Auth, merchant, KYC ─────────────────────────────────────── */
// Password rules from AGENTS.md §6: 10 to 128 characters, no composition rules, not equal to email.
export const PasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters");

export const SignupInputSchema = z
  .object({
    company_name: z.string().trim().min(2, "Enter your company name").max(120),
    email: z.email("Enter a valid email"),
    password: PasswordSchema,
  })
  .refine((v) => v.password.toLowerCase() !== v.email.toLowerCase(), {
    message: "Password must not be your email",
    path: ["password"],
  });
export type SignupInput = z.infer<typeof SignupInputSchema>;

export const LoginInputSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(128),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

/** Simulated KYC: nothing is verified. */
export const KycStatusSchema = z.enum(["not_submitted", "approved_sandbox"]);
export type KycStatus = z.infer<typeof KycStatusSchema>;

export const KycInputSchema = z.object({
  company_name: z.string().trim().min(2, "Enter the registered company name").max(120),
  registration_number: z.string().trim().min(1, "Enter the registration number").max(40),
  pan_vat: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "PAN/VAT is 9 digits (placeholder format, not verified)"),
});
export type KycInput = z.infer<typeof KycInputSchema>;

export const MerchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  registration_number: z.string().nullable(),
  pan_vat: z.string().nullable(),
  kyc_status: KycStatusSchema,
  created_at: Iso,
});
export type Merchant = z.infer<typeof MerchantSchema>;

export const UserSchema = z.object({ id: z.string(), email: z.email() });
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({ user: UserSchema, merchant: MerchantSchema });
export type Session = z.infer<typeof SessionSchema>;

/* ── Payment links (TRD §6: open -> paid | expired | cancelled) ── */
export const PaymentLinkStatusSchema = z.enum(["open", "paid", "expired", "cancelled"]);
export type PaymentLinkStatus = z.infer<typeof PaymentLinkStatusSchema>;

export const PaymentLinkSchema = z.object({
  id: z.string(),
  token: z.string(),
  url: z.string(),
  reference: z.string(),
  amount: MoneySchema,
  description: z.string(),
  client_name: z.string(),
  client_email: z.email(),
  due_date: DateOnly,
  status: PaymentLinkStatusSchema,
  created_at: Iso,
  expires_at: Iso,
  paid_at: IsoOrNull,
  expired_at: IsoOrNull,
  cancelled_at: IsoOrNull,
});
export type PaymentLink = z.infer<typeof PaymentLinkSchema>;

/** Request body for POST /v1/payment-links (sent with an Idempotency-Key header). */
export const CreatePaymentLinkRequestSchema = z.object({
  amount: MoneySchema.extend({ currency: z.literal("USD") }),
  description: z.string().trim().min(1).max(200),
  client_name: z.string().trim().min(1).max(120),
  client_email: z.email(),
  due_date: DateOnly,
});
export type CreatePaymentLinkRequest = z.infer<typeof CreatePaymentLinkRequestSchema>;

/**
 * Form shape for creating a link. The amount is typed as a decimal string ("1000.00")
 * and converted to cents with string arithmetic, never via floating point.
 */
export const CreatePaymentLinkFormSchema = z.object({
  amount_usd: z
    .string()
    .trim()
    .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount like 1000 or 1000.50")
    .refine((v) => /[1-9]/.test(v), "Amount must be greater than zero"),
  description: z.string().trim().min(1, "Enter a description").max(200, "Keep it under 200 characters"),
  client_name: z.string().trim().min(1, "Enter the client's name").max(120),
  client_email: z.email("Enter a valid email"),
  due_date: DateOnly,
});
export type CreatePaymentLinkForm = z.infer<typeof CreatePaymentLinkFormSchema>;

/* ── Payments (created -> pending | expired; pending -> succeeded | failed | expired) ── */
export const PaymentMethodSchema = z.enum(["card", "ach", "sepa", "swift"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentStatusSchema = z.enum(["created", "pending", "succeeded", "failed", "expired"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentSchema = z.object({
  id: z.string(),
  payment_link_id: z.string(),
  reference: z.string(),
  payer_name: z.string(),
  payer_country: z.string().length(2),
  method: PaymentMethodSchema,
  amount: MoneySchema,
  status: PaymentStatusSchema,
  created_at: Iso,
  pending_at: IsoOrNull,
  succeeded_at: IsoOrNull,
  failed_at: IsoOrNull,
  expired_at: IsoOrNull,
});
export type Payment = z.infer<typeof PaymentSchema>;

/* ── Settlements (pending -> settled | failed) ────────────────── */
export const SettlementStatusSchema = z.enum(["pending", "settled", "failed"]);
export type SettlementStatus = z.infer<typeof SettlementStatusSchema>;

export const SettlementSchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  reference: z.string(),
  gross: MoneySchema, // USD cents
  fee: MoneySchema, // USD cents, same currency as gross
  fee_bps: z.number().int().nonnegative(),
  net_usd: MoneySchema, // gross - fee, USD cents
  /** Simulated FX: NPR per USD x 1,000,000, as an integer string. */
  rate_micro: MinorUnitsSchema,
  rate_label: z.literal("simulated"),
  net_npr: MoneySchema, // NPR paisa
  status: SettlementStatusSchema,
  created_at: Iso,
  settled_at: IsoOrNull,
  failed_at: IsoOrNull,
});
export type Settlement = z.infer<typeof SettlementSchema>;

/* ── Documents (TRD §11) ──────────────────────────────────────── */
export const DOCUMENT_TITLE = "Himpaar Settlement Advice (simulated)" as const;

export const DocumentSchema = z.object({
  id: z.string(),
  settlement_id: z.string(),
  title: z.literal(DOCUMENT_TITLE),
  status: z.literal("generated"),
  merchant_name: z.string(),
  merchant_pan_vat: z.string().nullable(), // as entered, unverified
  payer_name: z.string(),
  payer_country: z.string().length(2),
  invoice_reference: z.string(),
  gross: MoneySchema,
  fee: MoneySchema,
  rate_micro: MinorUnitsSchema,
  rate_label: z.literal("simulated"),
  net_npr: MoneySchema,
  created_at: Iso, // AD
  created_at_bs: DateOnly, // BS, YYYY-MM-DD
  fiscal_year_label: z.string(), // e.g. "2083/84"
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export type SettlementDocument = z.infer<typeof DocumentSchema>;

/* ── Developers: API keys, webhooks ───────────────────────────── */
export const ApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(), // e.g. "hp_test_4f9a"; the full key is never returned again
  created_at: Iso,
  last_used_at: IsoOrNull,
  revoked_at: IsoOrNull,
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const CreateApiKeyInputSchema = z.object({
  name: z.string().trim().min(1, "Name the key").max(60),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInputSchema>;

/** Returned once, on creation only. */
export const CreatedApiKeySchema = z.object({ api_key: ApiKeySchema, secret: z.string() });
export type CreatedApiKey = z.infer<typeof CreatedApiKeySchema>;

export const WebhookEventTypeSchema = z.enum([
  "payment.succeeded",
  "payment.failed",
  "settlement.settled",
  "document.created",
]);
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const WebhookEndpointSchema = z.object({
  id: z.string(),
  url: z.url(),
  created_at: Iso,
});
export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

export const CreateWebhookEndpointInputSchema = z.object({
  url: z.url("Enter a full URL, e.g. https://example.com/webhooks"),
});
export type CreateWebhookEndpointInput = z.infer<typeof CreateWebhookEndpointInputSchema>;

export const CreatedWebhookEndpointSchema = z.object({
  endpoint: WebhookEndpointSchema,
  secret: z.string(), // shown once
});
export type CreatedWebhookEndpoint = z.infer<typeof CreatedWebhookEndpointSchema>;

export const WebhookDeliveryStatusSchema = z.enum(["pending", "delivered", "failed", "dead"]);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusSchema>;

export const WebhookDeliverySchema = z.object({
  id: z.string(),
  endpoint_id: z.string(),
  event_id: z.string(),
  event_type: WebhookEventTypeSchema,
  attempt: z.number().int().min(1).max(5),
  status: WebhookDeliveryStatusSchema,
  response_code: z.number().int().nullable(),
  created_at: Iso,
  next_attempt_at: IsoOrNull,
});
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

/* ── Public payer page and simulator (TRD §13) ───────────────── */
export const SimulateOutcomeSchema = z.enum(["success", "decline", "pending"]);
export type SimulateOutcome = z.infer<typeof SimulateOutcomeSchema>;

export const PublicPaymentLinkSchema = z.object({
  token: z.string(),
  merchant_name: z.string(),
  reference: z.string(),
  description: z.string(),
  amount: MoneySchema,
  due_date: DateOnly,
  status: PaymentLinkStatusSchema,
  sandbox: z.boolean(),
});
export type PublicPaymentLink = z.infer<typeof PublicPaymentLinkSchema>;

export const SimulateInputSchema = z.object({
  method: PaymentMethodSchema,
  outcome: SimulateOutcomeSchema,
});
export type SimulateInput = z.infer<typeof SimulateInputSchema>;

export const SimulateResultSchema = z.object({
  payment_status: PaymentStatusSchema,
  event_id: z.string(),
});
export type SimulateResult = z.infer<typeof SimulateResultSchema>;
