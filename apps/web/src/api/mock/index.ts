// In-memory + localStorage mock of the Himpaar API. Same interface as the real client.
// State persists across page refreshes so signup and login work reliably in mock mode.
import {
  DOCUMENT_TITLE,
  type Payment,
  type PaymentLink,
  type Session,
  type Settlement,
  type WebhookDelivery,
  type WebhookEventType,
} from "@himpaar/shared";
import {
  HimpaarApiError,
  type AdminAuditEntry,
  type AdminMerchant,
  type AdminSession,
  type HimpaarApi,
} from "../types.ts";
import { MOCK_FEE_BPS, MOCK_RATE_MICRO, createSeed, DEMO_EMAIL, type MockDb } from "./data.ts";
import { kathmanduDate, kathmanduIso, mockAdToBs, mockSettlementMath, randomHex, randomToken } from "./helpers.ts";

export const SESSION_KEY = "himpaar.mock.session";
export const ADMIN_SESSION_KEY = "himpaar.mock.admin_session";
export const DB_STORAGE_KEY = "himpaar.mock.db_v2";

export interface MockOptions {
  /** Artificial latency in ms so loading states are visible. 0 in tests. */
  latencyMs?: number;
  /** Storage for the mock session and state. Defaults to localStorage when available. */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  /** Start with this database (tests). */
  db?: MockDb;
}

function loadStoredDb(storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null): MockDb {
  const seed = createSeed();
  if (!storage) return seed;
  try {
    const raw = storage.getItem(DB_STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.merchants)) return seed;

    // Ensure demo user is always present in users list
    const hasDemo = parsed.users.some(
      (u: { email?: string }) => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase(),
    );
    if (!hasDemo && seed.users[0]) {
      parsed.users.push(seed.users[0]);
    }
    // Ensure demo merchant is present
    const hasDemoMerchant = parsed.merchants.some((m: { id?: string }) => m.id === "mer_0001");
    if (!hasDemoMerchant && seed.merchants[0]) {
      parsed.merchants.push(seed.merchants[0]);
    }

    return {
      users: parsed.users,
      merchants: parsed.merchants,
      links: Array.isArray(parsed.links) ? parsed.links : seed.links,
      payments: Array.isArray(parsed.payments) ? parsed.payments : seed.payments,
      settlements: Array.isArray(parsed.settlements) ? parsed.settlements : seed.settlements,
      documents: Array.isArray(parsed.documents) ? parsed.documents : seed.documents,
      apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : seed.apiKeys,
      endpoints: Array.isArray(parsed.endpoints) ? parsed.endpoints : seed.endpoints,
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : seed.deliveries,
      seenEventIds: new Set(Array.isArray(parsed.seenEventIds) ? parsed.seenEventIds : []),
      counters:
        parsed.counters && typeof parsed.counters.id === "number" ? parsed.counters : seed.counters,
      // Admin accounts always come from the seed so credentials can't drift in storage.
      admins: seed.admins,
      suspendedMerchantIds: Array.isArray(parsed.suspendedMerchantIds) ? parsed.suspendedMerchantIds : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : seed.audit,
    };
  } catch {
    return seed;
  }
}

function persistDb(db: MockDb, storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null) {
  if (!storage) return;
  try {
    const toSave = {
      ...db,
      seenEventIds: Array.from(db.seenEventIds),
    };
    storage.setItem(DB_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // quota exceeded or private mode
  }
}

export function resetMockStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
) {
  storage?.removeItem(DB_STORAGE_KEY);
  storage?.removeItem(SESSION_KEY);
  storage?.removeItem(ADMIN_SESSION_KEY);
}

export function createMockApi(opts: MockOptions = {}): HimpaarApi & { db: MockDb; reset: () => void } {
  const storage = opts.storage !== undefined ? opts.storage : typeof localStorage !== "undefined" ? localStorage : null;
  const db = opts.db ?? loadStoredDb(storage);
  const latency = opts.latencyMs ?? 80;

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
    // A suspended merchant is logged out on their next request.
    if (db.suspendedMerchantIds.includes(merchant.id)) {
      storage?.removeItem(SESSION_KEY);
      return null;
    }
    return { user: { id: user.id, email: user.email }, merchant };
  }

  function currentAdmin(): AdminSession | null {
    const adminId = storage?.getItem(ADMIN_SESSION_KEY);
    if (!adminId) return null;
    const a = db.admins.find((x) => x.id === adminId);
    return a ? { admin: { id: a.id, email: a.email, name: a.name } } : null;
  }

  function requireAdmin(): AdminSession {
    const a = currentAdmin();
    if (!a) throw new HimpaarApiError({ code: "UNAUTHENTICATED", message: "Admin login required", status: 401 });
    return a;
  }

  function audit(actor: string, entry: Omit<AdminAuditEntry, "id" | "at" | "actor">): void {
    db.audit.unshift({ id: nextId("aud"), at: kathmanduIso(), actor, ...entry });
  }

  function toAdminMerchant(m: MockDb["merchants"][number]): AdminMerchant {
    const users = db.users.filter((u) => u.merchant_id === m.id);
    return {
      ...m,
      suspended: db.suspendedMerchantIds.includes(m.id),
      owner_email: users[0]?.email ?? null,
      user_count: users.length,
    };
  }

  function findMerchant(id: string) {
    const m = db.merchants.find((x) => x.id === id);
    if (!m) throw notFound("Merchant");
    return m;
  }

  /** Settle a pending settlement and generate its document (shared by sandbox + admin). */
  function settle(st: Settlement, merchantName: string, merchantPanVat: string | null): Settlement {
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
      merchant_name: merchantName,
      merchant_pan_vat: merchantPanVat,
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
    persistDb(db, storage);
    return { ...st };
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
    persistDb(db, storage);
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
    persistDb(db, storage);
  }

  return {
    mode: "mock",
    db,
    reset: () => {
      resetMockStorage(storage);
      const seed = createSeed();
      Object.assign(db, seed);
    },

    getSession: () => wait(() => currentSession()),

    login: (input) =>
      wait(() => {
        const user = db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
        if (!user || user.password !== input.password) {
          if (user) {
            audit(user.email, { action: "user.login_failed", target_type: "user", target_id: user.id, summary: "Failed login (wrong password)" });
            persistDb(db, storage);
          }
          throw new HimpaarApiError({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect", status: 401 });
        }
        if (db.suspendedMerchantIds.includes(user.merchant_id)) {
          audit(user.email, { action: "user.login_blocked", target_type: "user", target_id: user.id, summary: "Login blocked: account suspended" });
          persistDb(db, storage);
          throw new HimpaarApiError({
            code: "MERCHANT_SUSPENDED",
            message: "This account is suspended. Contact support@himpaar.com.",
            status: 403,
          });
        }
        user.last_login_at = kathmanduIso();
        user.login_count = (user.login_count ?? 0) + 1;
        audit(user.email, { action: "user.login", target_type: "user", target_id: user.id, summary: "Logged in" });
        storage?.setItem(SESSION_KEY, user.id);
        persistDb(db, storage);
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
        const now = kathmanduIso();
        db.users.push({
          id: userId,
          email: input.email,
          password: input.password,
          merchant_id: merchantId,
          created_at: now,
          last_login_at: now,
          login_count: 1,
        });
        audit(input.email, {
          action: "user.signup",
          target_type: "merchant",
          target_id: merchantId,
          summary: `Signed up — ${input.company_name}`,
        });
        storage?.setItem(SESSION_KEY, userId);
        persistDb(db, storage);
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
        audit(s.user.email, {
          action: "user.kyc_submitted",
          target_type: "merchant",
          target_id: m.id,
          summary: `Submitted KYC — PAN/VAT ${input.pan_vat}`,
        });
        persistDb(db, storage);
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
        const session = requireSession();
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
        audit(session.user.email, {
          action: "user.link_created",
          target_type: "merchant",
          target_id: session.merchant.id,
          summary: `Created payment link ${l.reference}`,
        });
        db.links.push(l);
        persistDb(db, storage);
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
        persistDb(db, storage);
        return { api_key: key, secret };
      }),
    revokeApiKey: (id) =>
      wait(() => {
        requireSession();
        const k = db.apiKeys.find((x) => x.id === id);
        if (!k) throw notFound("API key");
        k.revoked_at ??= kathmanduIso();
        persistDb(db, storage);
      }),

    listWebhookEndpoints: () => wait(() => (requireSession(), [...db.endpoints])),
    createWebhookEndpoint: (input) =>
      wait(() => {
        requireSession();
        const endpoint = { id: nextId("we"), url: input.url, created_at: kathmanduIso() };
        db.endpoints.push(endpoint);
        persistDb(db, storage);
        return { endpoint, secret: `whsec_${randomToken(24)}` };
      }),
    deleteWebhookEndpoint: (id) =>
      wait(() => {
        requireSession();
        db.endpoints = db.endpoints.filter((e) => e.id !== id);
        persistDb(db, storage);
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
        persistDb(db, storage);
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
        persistDb(db, storage);
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
        persistDb(db, storage);
        return { ...p };
      }),

    sandboxAdvanceSettlement: (settlementId) =>
      wait(() => {
        const s = requireSession();
        const st = db.settlements.find((x) => x.id === settlementId);
        if (!st) throw notFound("Settlement");
        return settle(st, s.merchant.name, s.merchant.pan_vat);
      }),

    sandboxReplayWebhook: (deliveryId) =>
      wait(() => {
        requireSession();
        const d = db.deliveries.find((x) => x.id === deliveryId);
        if (!d) throw notFound("Delivery");
        return { duplicate: true as const, delivery: { ...d } };
      }),

    /* ── Admin console ─────────────────────────────────────────── */
    getAdminSession: () => wait(() => currentAdmin()),

    adminLogin: async (input) => {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.password));
      const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      return wait(() => {
        const a = db.admins.find((x) => x.email.toLowerCase() === input.email.trim().toLowerCase());
        if (!a || a.password_sha256 !== hash) {
          throw new HimpaarApiError({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect", status: 401 });
        }
        storage?.setItem(ADMIN_SESSION_KEY, a.id);
        audit(a.email, { action: "admin.login", target_type: "session", target_id: null, summary: "Signed in to admin console" });
        persistDb(db, storage);
        return requireAdmin();
      });
    },

    adminListUsers: () =>
      wait(() => {
        requireAdmin();
        return db.users
          .map((u) => {
            const m = db.merchants.find((x) => x.id === u.merchant_id);
            return {
              id: u.id,
              email: u.email,
              merchant_id: u.merchant_id,
              merchant_name: m?.name ?? "—",
              kyc_status: m?.kyc_status ?? ("not_submitted" as const),
              suspended: db.suspendedMerchantIds.includes(u.merchant_id),
              created_at: u.created_at ?? m?.created_at ?? null,
              last_login_at: u.last_login_at ?? null,
              login_count: u.login_count ?? 0,
            };
          })
          .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      }),

    adminLogout: () =>
      wait(() => {
        storage?.removeItem(ADMIN_SESSION_KEY);
      }),

    adminOverview: () =>
      wait(() => {
        requireAdmin();
        const sum = (xs: { amount_minor: string }[]) => xs.reduce((t, m) => t + BigInt(m.amount_minor), 0n).toString();
        const succeeded = db.payments.filter((p) => p.status === "succeeded");
        const pendingSt = db.settlements.filter((s) => s.status === "pending");
        return {
          merchants_total: db.merchants.length,
          merchants_pending_kyc: db.merchants.filter((m) => m.kyc_status !== "approved_sandbox").length,
          merchants_suspended: db.suspendedMerchantIds.length,
          payments_succeeded: succeeded.length,
          payments_pending: db.payments.filter((p) => p.status === "pending").length,
          payments_failed: db.payments.filter((p) => p.status === "failed").length,
          gross_volume: { amount_minor: sum(succeeded.map((p) => p.amount)), currency: "USD" as const },
          fees_earned: { amount_minor: sum(db.settlements.map((s) => s.fee)), currency: "USD" as const },
          settlements_pending: pendingSt.length,
          settlements_pending_npr: { amount_minor: sum(pendingSt.map((s) => s.net_npr)), currency: "NPR" as const },
          recent_merchants: [...db.merchants]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 5)
            .map(toAdminMerchant),
        };
      }),

    adminListMerchants: () =>
      wait(() => {
        requireAdmin();
        return [...db.merchants].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(toAdminMerchant);
      }),

    adminGetMerchant: (id) =>
      wait(() => {
        requireAdmin();
        const m = findMerchant(id);
        const users = db.users.filter((u) => u.merchant_id === id);
        const ids = new Set([id, ...users.map((u) => u.id)]);
        return {
          merchant: toAdminMerchant(m),
          users: users.map((u) => ({ id: u.id, email: u.email })),
          audit: db.audit.filter((a) => a.target_id !== null && ids.has(a.target_id)),
        };
      }),

    adminSetKycStatus: (id, status) =>
      wait(() => {
        const { admin } = requireAdmin();
        const m = findMerchant(id);
        if (m.kyc_status !== status) {
          m.kyc_status = status;
          audit(admin.email, {
            action: status === "approved_sandbox" ? "kyc.approved" : "kyc.revoked",
            target_type: "merchant",
            target_id: id,
            summary: `${status === "approved_sandbox" ? "Approved" : "Revoked"} KYC for ${m.name}`,
          });
          persistDb(db, storage);
        }
        return toAdminMerchant(m);
      }),

    adminSetSuspended: (id, suspended, reason) =>
      wait(() => {
        const { admin } = requireAdmin();
        const m = findMerchant(id);
        const isSuspended = db.suspendedMerchantIds.includes(id);
        if (suspended !== isSuspended) {
          db.suspendedMerchantIds = suspended
            ? [...db.suspendedMerchantIds, id]
            : db.suspendedMerchantIds.filter((x) => x !== id);
          const why = reason.trim();
          audit(admin.email, {
            action: suspended ? "merchant.suspended" : "merchant.reactivated",
            target_type: "merchant",
            target_id: id,
            summary: `${suspended ? "Suspended" : "Reactivated"} ${m.name}${why ? ` — ${why}` : ""}`,
          });
          persistDb(db, storage);
        }
        return toAdminMerchant(m);
      }),

    adminListPayments: () => wait(() => (requireAdmin(), [...db.payments])),
    adminListSettlements: () => wait(() => (requireAdmin(), [...db.settlements])),

    adminMarkSettlementPaid: (id) =>
      wait(() => {
        const { admin } = requireAdmin();
        const st = db.settlements.find((x) => x.id === id);
        if (!st) throw notFound("Settlement");
        // Mock links aren't scoped per merchant yet; attribute to the first merchant like the payer page does.
        const m = db.merchants[0];
        const result = settle(st, m?.name ?? "Merchant", m?.pan_vat ?? null);
        audit(admin.email, {
          action: "settlement.paid_out",
          target_type: "settlement",
          target_id: id,
          summary: `Marked ${st.reference} paid out (simulated)`,
        });
        persistDb(db, storage);
        return result;
      }),

    adminListAudit: () => wait(() => (requireAdmin(), [...db.audit])),
  };
}
