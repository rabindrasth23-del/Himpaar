// In-memory mock of the Himpaar API. Same interface as the real client.
// Data resets on page reload; only the mock session survives (localStorage).
import {
  DOCUMENT_TITLE,
  type Payment,
  type PaymentLink,
  type Session,
  type Settlement,
  type WebhookDelivery,
  type WebhookEventType,
} from "@himpaar/shared";
import { HimpaarApiError, type HimpaarApi } from "../types.ts";
import { MOCK_FEE_BPS, MOCK_RATE_MICRO, createSeed, type MockDb } from "./data.ts";
import { kathmanduDate, kathmanduIso, mockAdToBs, mockSettlementMath, randomHex, randomToken } from "./helpers.ts";

const SESSION_KEY = "himpaar.mock.session";

export interface MockOptions {
  /** Artificial latency in ms so loading states are visible. 0 in tests. */
  latencyMs?: number;
  /** Storage for the mock session. Defaults to localStorage when available. */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  /** Start with this database (tests). */
  db?: MockDb;
}

export function createMockApi(opts: MockOptions = {}): HimpaarApi & { db: MockDb } {
  const db = opts.db ?? createSeed();
  const latency = opts.latencyMs ?? 350;
  const storage = opts.storage !== undefined ? opts.storage : typeof localStorage !== "undefined" ? localStorage : null;

  const wait = <T>(value: T | (() => T)): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = () => {
        try {
          resolve(typeof value === "function" ? (value as () => T)() : value);
        } catch (e) {
          reject(e);
        }
      };
      if (latency <= 0) queueMicrotask(run);
      else setTimeout(run, latency);
    });

  const notFound = (what: string) =>
    new HimpaarApiError({ code: "NOT_FOUND", message: `${what} not found`, status: 404 });

  const nextId = (prefix: string) => `${prefix}_${(++db.counters.id).toString().padStart(4, "0")}`;

  function currentSession(): Session | null {
    const userId = storage?.getItem(SESSION_KEY);
    if (!userId) return null;
    const user = db.users.find((u) => u.id === userId);
    const merchant = user && db.merchants.find((m) => m.id === user.merchant_id);
    if (!user || !merchant) return null;
    return { user: { id: user.id, email: user.email }, merchant };
  }

  function requireSession(): Session {
    const s = currentSession();
    if (!s) throw new HimpaarApiError({ code: "UNAUTHENTICATED", message: "Please log in", status: 401 });
    return s;
  }

  function queueWebhook(event_type: WebhookEventType): void {
    for (const ep of db.endpoints) {
      db.deliveries.unshift({
        id: nextId("wd"),
        endpoint_id: ep.id,
        event_id: nextId("evt"),
        event_type,
        attempt: 1,
        status: "delivered",
        response_code: 200,
        created_at: kathmanduIso(),
        next_attempt_at: null,
      });
    }
  }

  function createSettlementFor(payment: Payment): Settlement {
    const { fee, netUsd, netNpr } = mockSettlementMath(
      BigInt(payment.amount.amount_minor),
      BigInt(MOCK_FEE_BPS),
      BigInt(MOCK_RATE_MICRO),
    );
    const s: Settlement = {
      id: nextId("stl"),
      payment_id: payment.id,
      reference: payment.reference,
      gross: payment.amount,
      fee: { amount_minor: fee.toString(), currency: "USD" },
      fee_bps: MOCK_FEE_BPS,
      net_usd: { amount_minor: netUsd.toString(), currency: "USD" },
      rate_micro: MOCK_RATE_MICRO,
      rate_label: "simulated",
      net_npr: { amount_minor: netNpr.toString(), currency: "NPR" },
      status: "pending",
      created_at: kathmanduIso(),
      settled_at: null,
      failed_at: null,
    };
    db.settlements.unshift(s);
    return s;
  }

  function succeedPayment(payment: Payment): void {
    payment.status = "succeeded";
    payment.succeeded_at = kathmanduIso();
    const l = db.links.find((x) => x.id === payment.payment_link_id);
    if (l) {
      l.status = "paid";
      l.paid_at = payment.succeeded_at;
    }
    createSettlementFor(payment);
    queueWebhook("payment.succeeded");
  }

  return {
    mode: "mock",
    db,

    getSession: () => wait(() => currentSession()),

    login: (input) =>
      wait(() => {
        const user = db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
        if (!user || user.password !== input.password) {
          throw new HimpaarApiError({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect", status: 401 });
        }
        storage?.setItem(SESSION_KEY, user.id);
        return requireSession();
      }),

    signup: (input) =>
      wait(() => {
        if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
          throw new HimpaarApiError({ code: "EMAIL_TAKEN", message: "An account with this email already exists", status: 409 });
        }
        const merchantId = nextId("mer");
        db.merchants.push({
          id: merchantId,
          name: input.company_name,
          registration_number: null,
          pan_vat: null,
          kyc_status: "not_submitted",
          created_at: kathmanduIso(),
        });
        const userId = nextId("usr");
        db.users.push({ id: userId, email: input.email, password: input.password, merchant_id: merchantId });
        storage?.setItem(SESSION_KEY, userId);
        return requireSession();
      }),

    logout: () =>
      wait(() => {
        storage?.removeItem(SESSION_KEY);
      }),

    submitKyc: (input) =>
      wait(() => {
        const s = requireSession();
        const m = db.merchants.find((x) => x.id === s.merchant.id);
        if (!m) throw notFound("Merchant");
        m.name = input.company_name;
        m.registration_number = input.registration_number;
        m.pan_vat = input.pan_vat;
        m.kyc_status = "approved_sandbox"; // simulated: nothing is checked
        return { ...m };
      }),

    listPaymentLinks: () => wait(() => (requireSession(), [...db.links].reverse())),
    getPaymentLink: (id) =>
      wait(() => {
        requireSession();
        const l = db.links.find((x) => x.id === id);
        if (!l) throw notFound("Payment link");
        return { ...l };
      }),

    createPaymentLink: (input, idempotencyKey) =>
      wait(() => {
        requireSession();
        if (!idempotencyKey) {
          throw new HimpaarApiError({ code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required", status: 400 });
        }
        const n = ++db.counters.invoice;
        const token = randomToken(16); // 128 bits
        const l: PaymentLink = {
          id: `pl_${n.toString().padStart(4, "0")}`,
          token,
          url: `/pay/${token}`,
          reference: `INV-${n.toString().padStart(4, "0")}`,
          amount: input.amount,
          description: input.description,
          client_name: input.client_name,
          client_email: input.client_email,
          due_date: input.due_date,
          status: "open",
          created_at: kathmanduIso(),
          expires_at: `${input.due_date}T23:59:59+05:45`,
          paid_at: null,
          expired_at: null,
          cancelled_at: null,
        };
        db.links.push(l);
        return { ...l };
      }),

    listPayments: () => wait(() => (requireSession(), [...db.payments])),
    getPayment: (id) =>
      wait(() => {
        requireSession();
        const p = db.payments.find((x) => x.id === id);
        if (!p) throw notFound("Payment");
        return { ...p };
      }),

    listSettlements: () => wait(() => (requireSession(), [...db.settlements])),
    getSettlement: (id) =>
      wait(() => {
        requireSession();
        const s = db.settlements.find((x) => x.id === id);
        if (!s) throw notFound("Settlement");
        return { ...s };
      }),

    listDocuments: () => wait(() => (requireSession(), [...db.documents])),
    getDocument: (id) =>
      wait(() => {
        requireSession();
        const d = db.documents.find((x) => x.id === id);
        if (!d) throw notFound("Document");
        return { ...d };
      }),

    listApiKeys: () => wait(() => (requireSession(), [...db.apiKeys])),
    createApiKey: (input) =>
      wait(() => {
        requireSession();
        const secret = `hp_test_${randomToken(24)}`;
        const key = {
          id: nextId("key"),
          name: input.name,
          prefix: secret.slice(0, 12),
          created_at: kathmanduIso(),
          last_used_at: null,
          revoked_at: null,
        };
        db.apiKeys.unshift(key);
        return { api_key: key, secret };
      }),
    revokeApiKey: (id) =>
      wait(() => {
        requireSession();
        const k = db.apiKeys.find((x) => x.id === id);
        if (!k) throw notFound("API key");
        k.revoked_at ??= kathmanduIso();
      }),

    listWebhookEndpoints: () => wait(() => (requireSession(), [...db.endpoints])),
    createWebhookEndpoint: (input) =>
      wait(() => {
        requireSession();
        const endpoint = { id: nextId("we"), url: input.url, created_at: kathmanduIso() };
        db.endpoints.push(endpoint);
        return { endpoint, secret: `whsec_${randomToken(24)}` };
      }),
    deleteWebhookEndpoint: (id) =>
      wait(() => {
        requireSession();
        db.endpoints = db.endpoints.filter((e) => e.id !== id);
      }),
    listWebhookDeliveries: () => wait(() => (requireSession(), [...db.deliveries])),
    redeliverWebhook: (id) =>
      wait(() => {
        requireSession();
        const d = db.deliveries.find((x) => x.id === id);
        if (!d) throw notFound("Delivery");
        const retry: WebhookDelivery = {
          ...d,
          id: nextId("wd"),
          attempt: Math.min(d.attempt + 1, 5),
          status: "delivered",
          response_code: 200,
          created_at: kathmanduIso(),
          next_attempt_at: null,
        };
        db.deliveries.unshift(retry);
        return retry;
      }),

    getPublicPaymentLink: (token) =>
      wait(() => {
        const l = db.links.find((x) => x.token === token);
        if (!l) throw notFound("Payment link");
        const merchant = db.merchants[0];
        return {
          token: l.token,
          merchant_name: merchant?.name ?? "Merchant",
          reference: l.reference,
          description: l.description,
          amount: l.amount,
          due_date: l.due_date,
          status: l.status,
          sandbox: true,
        };
      }),

    simulatePayment: (token, input, eventId) =>
      wait(() => {
        const l = db.links.find((x) => x.token === token);
        if (!l) throw notFound("Payment link");
        // Duplicate bank event: return the same result, change nothing (dedupe on event id).
        const existing = db.payments.find((p) => p.payment_link_id === l.id && db.seenEventIds.has(eventId));
        if (existing) return { payment_status: existing.status, event_id: eventId };
        if (l.status !== "open") {
          throw new HimpaarApiError({ code: "LINK_NOT_OPEN", message: `This link is ${l.status}`, status: 409 });
        }
        db.seenEventIds.add(eventId);
        const now = kathmanduIso();
        const payment: Payment = {
          id: nextId("pay"),
          payment_link_id: l.id,
          reference: l.reference,
          payer_name: l.client_name,
          payer_country: "US",
          method: input.method,
          amount: l.amount,
          status: "pending",
          created_at: now,
          pending_at: now,
          succeeded_at: null,
          failed_at: null,
          expired_at: null,
        };
        db.payments.unshift(payment);
        if (input.outcome === "success") succeedPayment(payment);
        if (input.outcome === "decline") {
          payment.status = "failed";
          payment.failed_at = now;
          queueWebhook("payment.failed");
        }
        return { payment_status: payment.status, event_id: eventId };
      }),

    sandboxCompletePending: (paymentId) =>
      wait(() => {
        requireSession();
        const p = db.payments.find((x) => x.id === paymentId);
        if (!p) throw notFound("Payment");
        if (p.status !== "pending") {
          throw new HimpaarApiError({ code: "ILLEGAL_TRANSITION", message: `Cannot complete a ${p.status} payment`, status: 409 });
        }
        succeedPayment(p);
        return { ...p };
      }),

    sandboxAdvanceSettlement: (settlementId) =>
      wait(() => {
        const s = requireSession();
        const st = db.settlements.find((x) => x.id === settlementId);
        if (!st) throw notFound("Settlement");
        if (st.status !== "pending") {
          throw new HimpaarApiError({ code: "ILLEGAL_TRANSITION", message: `Cannot settle a ${st.status} settlement`, status: 409 });
        }
        st.status = "settled";
        st.settled_at = kathmanduIso();
        const payment = db.payments.find((p) => p.id === st.payment_id);
        const today = kathmanduDate();
        db.documents.unshift({
          id: nextId("doc"),
          settlement_id: st.id,
          title: DOCUMENT_TITLE,
          status: "generated",
          merchant_name: s.merchant.name,
          merchant_pan_vat: s.merchant.pan_vat,
          payer_name: payment?.payer_name ?? "Payer",
          payer_country: payment?.payer_country ?? "US",
          invoice_reference: st.reference,
          gross: st.gross,
          fee: st.fee,
          rate_micro: st.rate_micro,
          rate_label: "simulated",
          net_npr: st.net_npr,
          created_at: st.settled_at,
          created_at_bs: mockAdToBs(today) ?? "0000-00-00",
          fiscal_year_label: "2083/84",
          sha256: randomHex(32),
        });
        queueWebhook("settlement.settled");
        queueWebhook("document.created");
        return { ...st };
      }),

    sandboxReplayWebhook: (deliveryId) =>
      wait(() => {
        requireSession();
        const d = db.deliveries.find((x) => x.id === deliveryId);
        if (!d) throw notFound("Delivery");
        // Same event id again: the receiver should recognise it and do nothing.
        return { duplicate: true as const, delivery: { ...d } };
      }),
  };
}
