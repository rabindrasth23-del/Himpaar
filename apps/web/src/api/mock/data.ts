// Sample data for the mock API. Everything here is simulated and fictional.
// Headline example (matches the brief): USD 1,000.00 payment, 1% fee (simulated),
// simulated rate NPR 134.25 per USD, NPR net 13,290,750 paisa (NPR 132,907.50).
// BS dates were computed once with nepali-date-library@1.1.16 (ADtoBS) and pasted here.
import {
  DOCUMENT_TITLE,
  type ApiKey,
  type Merchant,
  type Payment,
  type PaymentLink,
  type SettlementDocument,
  type Settlement,
  type User,
  type WebhookDelivery,
  type WebhookEndpoint,
} from "@himpaar/shared";

export const MOCK_RATE_MICRO = "134250000"; // NPR 134.25 per USD, simulated
export const MOCK_FEE_BPS = 100; // 1%, simulated (UNVERIFIED_DEMO_FEE_BPS)

export interface MockDb {
  users: (User & {
    password: string;
    merchant_id: string;
    created_at?: string;
    last_login_at?: string | null;
    login_count?: number;
  })[];
  merchants: Merchant[];
  links: PaymentLink[];
  payments: Payment[];
  settlements: Settlement[];
  documents: SettlementDocument[];
  apiKeys: ApiKey[];
  endpoints: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
  seenEventIds: Set<string>;
  counters: { invoice: number; id: number };
  /** Admin console accounts. Only a SHA-256 of the password is kept: this bundle is public. */
  admins: { id: string; email: string; name: string; password_sha256: string }[];
  /** Merchant ids an admin has suspended. Suspended merchants cannot log in. */
  suspendedMerchantIds: string[];
  /** Admin actions and user activity (signups, logins, KYC, links), newest first. */
  audit: {
    id: string;
    at: string;
    actor: string;
    action: string;
    target_type: "merchant" | "settlement" | "session" | "user";
    target_id: string | null;
    summary: string;
  }[];
}

export const ADMIN_EMAIL = "rabindra23@gmail.com";
const ADMIN_PASSWORD_SHA256 = "0e968b4087016d51055cfc26fd6df64b3f05d658a10fbd91efe24698d3453291";

const usd = (amount_minor: string) => ({ amount_minor, currency: "USD" as const });
const npr = (amount_minor: string) => ({ amount_minor, currency: "NPR" as const });

const link = (
  n: number,
  token: string,
  amount: string,
  description: string,
  client_name: string,
  client_email: string,
  due_date: string,
  status: PaymentLink["status"],
  created_at: string,
  extra: Partial<PaymentLink> = {},
): PaymentLink => ({
  id: `pl_${n.toString().padStart(4, "0")}`,
  token,
  url: `/pay/${token}`,
  reference: `INV-${n.toString().padStart(4, "0")}`,
  amount: usd(amount),
  description,
  client_name,
  client_email,
  due_date,
  status,
  created_at,
  expires_at: `${due_date}T23:59:59+05:45`,
  paid_at: null,
  expired_at: null,
  cancelled_at: null,
  ...extra,
});

export const DEMO_EMAIL = "demo@everestpixel.example";
export const DEMO_PASSWORD = "sandbox-demo-123";
export const DEMO_TOKEN = "q8Zr3VnKx2LwT7pYbM4cHd"; // the open INV-0005 link

export function createSeed(): MockDb {
  const merchant: Merchant = {
    id: "mer_0001",
    name: "Everest Pixel Labs Pvt. Ltd.",
    registration_number: "123456/079/080",
    pan_vat: "609876543",
    kyc_status: "approved_sandbox",
    created_at: "2026-09-28T09:00:00+05:45",
  };

  const links: PaymentLink[] = [
    link(1, "Hn4sQ9wE2rT6yU8iO0pA1s", "100000", "Website development, October", "Acme Studio LLC", "ap@acmestudio.example", "2026-10-15", "paid", "2026-10-01T11:20:00+05:45", { paid_at: "2026-10-08T14:05:00+05:45" }),
    link(2, "Jk7dF3gH5jK9lZ1xC2vB4n", "240000", "Mobile app sprint 4", "Nordlicht GmbH", "finance@nordlicht.example", "2026-10-20", "paid", "2026-10-03T10:00:00+05:45", { paid_at: "2026-10-10T16:40:00+05:45" }),
    link(3, "Mn6bV8cX0zL2kJ4hG6fD8s", "38000", "Logo refresh", "Maple & Co", "hello@mapleco.example", "2026-10-25", "open", "2026-10-07T09:30:00+05:45"),
    link(4, "Pq1wE3rT5yU7iO9pA2sD4f", "120000", "Server maintenance, Q3", "Harbour Digital Ltd", "accounts@harbour.example", "2026-10-30", "open", "2026-10-09T13:15:00+05:45"),
    link(5, DEMO_TOKEN, "75000", "UX audit and report", "Fjord Analytics AS", "billing@fjord.example", "2026-11-15", "open", "2026-10-11T08:45:00+05:45"),
    link(6, "Zx9cV7bN5mL3kJ1hG8fD6s", "52000", "Landing page copy", "Sunset Ventures", "ops@sunset.example", "2026-10-05", "expired", "2026-09-28T15:00:00+05:45", { expired_at: "2026-10-05T23:59:59+05:45" }),
  ];

  const payments: Payment[] = [
    {
      id: "pay_0001", payment_link_id: "pl_0001", reference: "INV-0001", payer_name: "Acme Studio LLC", payer_country: "US",
      method: "card", amount: usd("100000"), status: "succeeded",
      created_at: "2026-10-08T14:02:00+05:45", pending_at: "2026-10-08T14:02:30+05:45", succeeded_at: "2026-10-08T14:05:00+05:45", failed_at: null, expired_at: null,
    },
    {
      id: "pay_0002", payment_link_id: "pl_0002", reference: "INV-0002", payer_name: "Nordlicht GmbH", payer_country: "DE",
      method: "sepa", amount: usd("240000"), status: "succeeded",
      created_at: "2026-10-10T16:30:00+05:45", pending_at: "2026-10-10T16:31:00+05:45", succeeded_at: "2026-10-10T16:40:00+05:45", failed_at: null, expired_at: null,
    },
    {
      id: "pay_0003", payment_link_id: "pl_0003", reference: "INV-0003", payer_name: "Maple & Co", payer_country: "CA",
      method: "ach", amount: usd("38000"), status: "pending",
      created_at: "2026-10-12T10:10:00+05:45", pending_at: "2026-10-12T10:10:20+05:45", succeeded_at: null, failed_at: null, expired_at: null,
    },
    {
      id: "pay_0004", payment_link_id: "pl_0004", reference: "INV-0004", payer_name: "Harbour Digital Ltd", payer_country: "GB",
      method: "swift", amount: usd("120000"), status: "failed",
      created_at: "2026-10-11T12:00:00+05:45", pending_at: "2026-10-11T12:00:40+05:45", succeeded_at: null, failed_at: "2026-10-11T12:03:00+05:45", expired_at: null,
    },
  ];

  const settlements: Settlement[] = [
    {
      // 100000 cents gross, 1% fee = 1000, net 99000 cents x 134.25 = 13,290,750 paisa
      id: "stl_0001", payment_id: "pay_0001", reference: "INV-0001",
      gross: usd("100000"), fee: usd("1000"), fee_bps: MOCK_FEE_BPS, net_usd: usd("99000"),
      rate_micro: MOCK_RATE_MICRO, rate_label: "simulated", net_npr: npr("13290750"),
      status: "settled", created_at: "2026-10-08T14:05:01+05:45", settled_at: "2026-10-09T10:00:00+05:45", failed_at: null,
    },
    {
      // 240000 cents gross, fee 2400, net 237600 cents x 134.25 = 31,897,800 paisa
      id: "stl_0002", payment_id: "pay_0002", reference: "INV-0002",
      gross: usd("240000"), fee: usd("2400"), fee_bps: MOCK_FEE_BPS, net_usd: usd("237600"),
      rate_micro: MOCK_RATE_MICRO, rate_label: "simulated", net_npr: npr("31897800"),
      status: "pending", created_at: "2026-10-10T16:40:01+05:45", settled_at: null, failed_at: null,
    },
  ];

  const documents: SettlementDocument[] = [
    {
      id: "doc_0001", settlement_id: "stl_0001", title: DOCUMENT_TITLE, status: "generated",
      merchant_name: merchant.name, merchant_pan_vat: merchant.pan_vat,
      payer_name: "Acme Studio LLC", payer_country: "US", invoice_reference: "INV-0001",
      gross: usd("100000"), fee: usd("1000"), rate_micro: MOCK_RATE_MICRO, rate_label: "simulated", net_npr: npr("13290750"),
      created_at: "2026-10-09T10:00:05+05:45", created_at_bs: "2083-06-23", fiscal_year_label: "2083/84",
      // Sample hash for the mock only; the API computes the real SHA-256 of the JSON.
      sha256: "3f6c1e0a9b7d4c2e8f5a1b3c7d9e0f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c0d2e",
    },
  ];

  const apiKeys: ApiKey[] = [
    { id: "key_0001", name: "Server key", prefix: "hp_test_4f9a", created_at: "2026-09-29T12:00:00+05:45", last_used_at: "2026-10-12T09:41:00+05:45", revoked_at: null },
    { id: "key_0002", name: "Old staging key", prefix: "hp_test_b21c", created_at: "2026-09-28T10:00:00+05:45", last_used_at: "2026-10-01T18:00:00+05:45", revoked_at: "2026-10-02T09:00:00+05:45" },
  ];

  const endpoints: WebhookEndpoint[] = [
    { id: "we_0001", url: "https://example.com/webhooks/himpaar", created_at: "2026-09-29T12:05:00+05:45" },
  ];

  const deliveries: WebhookDelivery[] = [
    { id: "wd_0006", endpoint_id: "we_0001", event_id: "evt_0006", event_type: "payment.failed", attempt: 1, status: "delivered", response_code: 200, created_at: "2026-10-11T12:03:01+05:45", next_attempt_at: null },
    { id: "wd_0005", endpoint_id: "we_0001", event_id: "evt_0005", event_type: "payment.succeeded", attempt: 2, status: "failed", response_code: 500, created_at: "2026-10-10T16:41:01+05:45", next_attempt_at: "2026-10-10T16:46:01+05:45" },
    { id: "wd_0003", endpoint_id: "we_0001", event_id: "evt_0003", event_type: "document.created", attempt: 1, status: "delivered", response_code: 200, created_at: "2026-10-09T10:00:06+05:45", next_attempt_at: null },
    { id: "wd_0002", endpoint_id: "we_0001", event_id: "evt_0002", event_type: "settlement.settled", attempt: 1, status: "delivered", response_code: 200, created_at: "2026-10-09T10:00:01+05:45", next_attempt_at: null },
    { id: "wd_0001", endpoint_id: "we_0001", event_id: "evt_0001", event_type: "payment.succeeded", attempt: 1, status: "delivered", response_code: 200, created_at: "2026-10-08T14:05:02+05:45", next_attempt_at: null },
  ];

  return {
    users: [
      {
        id: "usr_0001",
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        merchant_id: merchant.id,
        created_at: merchant.created_at,
        last_login_at: "2026-10-12T09:40:00+05:45",
        login_count: 7,
      },
    ],
    merchants: [merchant],
    links,
    payments,
    settlements,
    documents,
    apiKeys,
    endpoints,
    deliveries,
    seenEventIds: new Set(),
    counters: { invoice: 6, id: 100 },
    admins: [{ id: "adm_0001", email: ADMIN_EMAIL, name: "Rabindra", password_sha256: ADMIN_PASSWORD_SHA256 }],
    suspendedMerchantIds: [],
    audit: [
      {
        id: "aud_0001",
        at: "2026-09-28T09:05:00+05:45",
        actor: ADMIN_EMAIL,
        action: "kyc.approved",
        target_type: "merchant",
        target_id: merchant.id,
        summary: `Approved KYC for ${merchant.name}`,
      },
    ],
  };
}
