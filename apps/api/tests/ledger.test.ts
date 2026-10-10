/**
 * Ledger integration tests — Prompt 3, step 3.
 *
 * These tests run against the DATABASE_TEST_URL database ONLY.
 * They refuse to run if DATABASE_TEST_URL equals DATABASE_URL or
 * DATABASE_MIGRATE_URL to prevent accidental writes to production.
 *
 * The ledger is append-only so each test uses unique account/payment IDs.
 *
 * KEY INSIGHT: pgledger uses auto-generated `id` (e.g. "pgla_01M4...")
 * as the account identifier in transfers, NOT the human-readable `name`.
 * We must capture the `id` from create_account's return value.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";

// ── Safety guard ──────────────────────────────────────────────────
const TEST_URL = process.env["DATABASE_TEST_URL"];
const MAIN_URL = process.env["DATABASE_URL"];
const MIGRATE_URL = process.env["DATABASE_MIGRATE_URL"];

if (!TEST_URL) {
  throw new Error(
    "DATABASE_TEST_URL is not set. Run: pnpm db:setup-test first."
  );
}
if (TEST_URL === MAIN_URL || TEST_URL === MIGRATE_URL) {
  throw new Error(
    "DATABASE_TEST_URL must differ from DATABASE_URL and DATABASE_MIGRATE_URL."
  );
}

// ── Helpers ───────────────────────────────────────────────────────
let ownerPool: pg.Pool; // neondb_owner — full rights
let appPool: pg.Pool; // himpaar_app — restricted

function buildAppTestUrl(): string {
  if (!MAIN_URL) throw new Error("DATABASE_URL not set");
  const main = new URL(MAIN_URL);
  const test = new URL(TEST_URL!);
  test.username = main.username;
  test.password = main.password;
  return test.toString();
}

let counter = 0;
function uid(): string {
  return `t_${Date.now()}_${++counter}`;
}

/** Create an account via pgledger and return its generated id. */
async function createAccount(
  pool: pg.Pool,
  name: string,
  currency: string,
  allowNeg: boolean,
  allowPos: boolean
): Promise<string> {
  const res = await pool.query(
    `SELECT * FROM pgledger.pgledger_create_account($1, $2, $3, $4)`,
    [name, currency, allowNeg, allowPos]
  );
  return res.rows[0].id as string;
}

// ── Setup / Teardown ─────────────────────────────────────────────
beforeAll(async () => {
  ownerPool = new pg.Pool({ connectionString: TEST_URL, max: 4 });
  appPool = new pg.Pool({ connectionString: buildAppTestUrl(), max: 4 });
  await ownerPool.query("SELECT 1");
  await appPool.query("SELECT 1");
});

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

// ═══════════════════════════════════════════════════════════════════
// 1. Privilege checks — app role cannot mutate pgledger directly
// ═══════════════════════════════════════════════════════════════════

describe("pgledger privilege enforcement", () => {
  it("app role UPDATE on pgledger_accounts fails", async () => {
    await expect(
      appPool.query(
        "UPDATE pgledger.pgledger_accounts SET balance = 999 WHERE name = 'platform:usd:external'"
      )
    ).rejects.toThrow(/permission denied/i);
  });

  it("app role UPDATE on pgledger_transfers fails", async () => {
    // First create accounts and a transfer via owner so there's a real row
    const a = await createAccount(ownerPool, uid(), "USD", true, true);
    const b = await createAccount(ownerPool, uid(), "USD", true, true);
    await ownerPool.query(
      "SELECT pgledger.pgledger_create_transfer($1, $2, 100, now(), '{}'::jsonb)",
      [a, b]
    );
    // App role cannot UPDATE it
    await expect(
      appPool.query(
        `UPDATE pgledger.pgledger_transfers SET amount = 0 WHERE from_account_id = $1`,
        [a]
      )
    ).rejects.toThrow(/permission denied/i);
  });

  it("app role DELETE on pgledger_entries fails", async () => {
    await expect(
      appPool.query("DELETE FROM pgledger.pgledger_entries WHERE true")
    ).rejects.toThrow(/permission denied/i);
  });

  it("app role direct INSERT into pgledger_entries fails", async () => {
    await expect(
      appPool.query("INSERT INTO pgledger.pgledger_entries DEFAULT VALUES")
    ).rejects.toThrow(/permission denied/i);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Trigger-based immutability — even owner can't update/delete
//    NOTE: triggers fire PER ROW, so they only fire when rows match.
// ═══════════════════════════════════════════════════════════════════

describe("pgledger trigger immutability (owner role)", () => {
  let transferFromId: string;

  beforeAll(async () => {
    // Create a transfer so we have real rows to target
    const a = await createAccount(ownerPool, uid(), "USD", true, true);
    const b = await createAccount(ownerPool, uid(), "USD", true, true);
    await ownerPool.query(
      "SELECT pgledger.pgledger_create_transfer($1, $2, 50, now(), '{}'::jsonb)",
      [a, b]
    );
    transferFromId = a;
  });

  it("owner UPDATE on pgledger_transfers is blocked by trigger", async () => {
    await expect(
      ownerPool.query(
        `UPDATE pgledger.pgledger_transfers SET amount = 0 WHERE from_account_id = $1`,
        [transferFromId]
      )
    ).rejects.toThrow(/immutable|blocked/i);
  });

  it("owner DELETE on pgledger_entries is blocked by trigger", async () => {
    await expect(
      ownerPool.query(
        `DELETE FROM pgledger.pgledger_entries WHERE account_id = $1`,
        [transferFromId]
      )
    ).rejects.toThrow(/immutable|blocked/i);
  });

  it("owner DELETE on pgledger_accounts is blocked by trigger", async () => {
    await expect(
      ownerPool.query(
        `DELETE FROM pgledger.pgledger_accounts WHERE id = $1`,
        [transferFromId]
      )
    ).rejects.toThrow(/immutable|blocked/i);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. App role CAN call API functions (SECURITY DEFINER)
// ═══════════════════════════════════════════════════════════════════

describe("app role can call pgledger API functions", () => {
  it("create_account succeeds via app role", async () => {
    const id = await createAccount(appPool, uid(), "USD", true, true);
    expect(id).toMatch(/^pgla_/);
  });

  it("create_transfer succeeds via app role", async () => {
    const a = await createAccount(appPool, uid(), "USD", true, true);
    const b = await createAccount(appPool, uid(), "USD", true, true);
    const res = await appPool.query(
      "SELECT pgledger.pgledger_create_transfer($1, $2, 5000, now(), '{}'::jsonb)",
      [a, b]
    );
    expect(res.rowCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. REVOKE verification — another role cannot call API functions
// ═══════════════════════════════════════════════════════════════════

describe("non-privileged role cannot call pgledger functions", () => {
  const TEMP_ROLE = `test_noprivs_${Date.now()}`;
  // Neon enforces strong passwords: uppercase, lowercase, digits, special chars, 16+ chars
  const TEMP_PW = `T3st!Np_${Date.now()}_Zq`;
  let tempClient: pg.Client;

  beforeAll(async () => {
    await ownerPool.query(`CREATE ROLE "${TEMP_ROLE}" LOGIN PASSWORD ${pg.escapeLiteral(TEMP_PW)}`);
    await ownerPool.query(
      `DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO "${TEMP_ROLE}"', current_database()); END $$`
    );
    await ownerPool.query(`GRANT USAGE ON SCHEMA pgledger TO "${TEMP_ROLE}"`);

    const tempUrl = new URL(TEST_URL!);
    tempUrl.username = TEMP_ROLE;
    tempUrl.password = TEMP_PW;
    tempClient = new pg.Client({ connectionString: tempUrl.toString() });
    await tempClient.connect();
  });

  afterAll(async () => {
    if (tempClient) await tempClient.end();
    // Must revoke grants before dropping the role
    await ownerPool.query(
      `DO $$ BEGIN EXECUTE format('REVOKE ALL ON DATABASE %I FROM "${TEMP_ROLE}"', current_database()); END $$`
    );
    await ownerPool.query(`REVOKE ALL ON SCHEMA pgledger FROM "${TEMP_ROLE}"`);
    await ownerPool.query(`DROP ROLE IF EXISTS "${TEMP_ROLE}"`);
  });

  it("temp role cannot call pgledger_create_account", async () => {
    await expect(
      tempClient.query(
        "SELECT pgledger.pgledger_create_account('shouldfail', 'USD', true, true)"
      )
    ).rejects.toThrow(/permission denied/i);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Idempotency — duplicate payment step posting
// ═══════════════════════════════════════════════════════════════════

describe("payment step idempotency", () => {
  it("two sequential postings of the same payment step: second fails", async () => {
    const from = await createAccount(appPool, uid(), "USD", true, true);
    const to = await createAccount(appPool, uid(), "USD", true, true);
    const paymentId = uid();
    const meta = JSON.stringify({ payment_id: paymentId, step: "capture" });

    // First posting succeeds
    await appPool.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, 1000, now(), $3::jsonb)`,
      [from, to, meta]
    );

    // Second posting with same metadata fails (unique index)
    await expect(
      appPool.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 1000, now(), $3::jsonb)`,
        [from, to, meta]
      )
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it("duplicate bank event writes no new row", async () => {
    const eventId = uid();
    await ownerPool.query(
      `INSERT INTO bank_events (id, event_id, payload_hash, payload) VALUES ($1, $2, 'hash1', '{}')`,
      [uid(), eventId]
    );
    await expect(
      ownerPool.query(
        `INSERT INTO bank_events (id, event_id, payload_hash, payload) VALUES ($1, $2, 'hash1', '{}')`,
        [uid(), eventId]
      )
    ).rejects.toThrow(/unique|duplicate/i);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. FX legs atomicity — all or nothing
// ═══════════════════════════════════════════════════════════════════

describe("FX legs atomicity", () => {
  it("FX legs roll back together when Transfer 4 fails", async () => {
    const ext = await createAccount(appPool, uid(), "USD", true, false);
    const fees = await createAccount(appPool, uid(), "USD", false, true);
    const fxUsd = await createAccount(appPool, uid(), "USD", false, true);
    const fxNpr = await createAccount(appPool, uid(), "NPR", true, false);
    const merchantNpr = await createAccount(appPool, uid(), "NPR", false, true);

    const paymentId = uid();

    // Use a manual transaction with per-leg create_transfer calls.
    // pgledger_create_transfers applies ONE metadata to ALL rows, which
    // would violate our unique index on (payment_id, step). So we use
    // individual calls in a transaction for atomicity.
    const client = await appPool.connect();
    try {
      await client.query("BEGIN");
      // T1: fee
      await client.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 100, now(), $3::jsonb)`,
        [ext, fees, JSON.stringify({ payment_id: paymentId, step: "fee" })]
      );
      // T2: net USD
      await client.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 900, now(), $3::jsonb)`,
        [ext, fxUsd, JSON.stringify({ payment_id: paymentId, step: "net_usd" })]
      );
      // T3: NPR payout
      await client.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 120000, now(), $3::jsonb)`,
        [fxNpr, merchantNpr, JSON.stringify({ payment_id: paymentId, step: "npr_payout" })]
      );
      // T4: bad reversal — tries to debit merchantNpr (only allows positive)
      await client.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 999999999, now(), $3::jsonb)`,
        [merchantNpr, fxNpr, JSON.stringify({ payment_id: paymentId, step: "bad_reversal" })]
      );
      await client.query("COMMIT");
      // Should not reach here
      expect.unreachable("T4 should have failed");
    } catch {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    // ALL legs rolled back — no transfers for this payment
    const entries = await ownerPool.query(
      `SELECT count(*)::int as cnt FROM pgledger.pgledger_transfers
       WHERE metadata->>'payment_id' = $1`,
      [paymentId]
    );
    expect(entries.rows[0].cnt).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. BigInt handling — amounts above 2^53
// ═══════════════════════════════════════════════════════════════════

describe("BigInt handling", () => {
  it("amount above 2^53 reads correctly via balance::text and BigInt", async () => {
    const a = await createAccount(ownerPool, uid(), "NPR", true, true);
    const b = await createAccount(ownerPool, uid(), "NPR", true, true);

    // 2^53 + 1 = 9007199254740993 — overflows JS Number
    const bigAmount = "9007199254740993";
    await ownerPool.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, ${bigAmount}, now(), '{}'::jsonb)`,
      [a, b]
    );

    const res = await ownerPool.query(
      `SELECT balance::text AS balance FROM pgledger.pgledger_accounts WHERE id = $1`,
      [b]
    );
    expect(res.rows[0].balance).toBe(bigAmount);

    const parsed = BigInt(res.rows[0].balance);
    expect(parsed).toBe(BigInt("9007199254740993"));
    // Prove Number would lose precision
    expect(parsed).not.toBe(BigInt(Number(bigAmount)));
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Rounding examples (TRD §5)
// ═══════════════════════════════════════════════════════════════════

describe("rounding calculations", () => {
  const FEE_BPS = 100n; // 1%
  const FX_MICRO = 134_250_000n; // 134.25 NPR/USD × 1,000,000

  function calcFee(grossCents: bigint, bps: bigint): bigint {
    const num = grossCents * bps;
    const denom = 10_000n;
    return (num + denom - 1n) / denom; // ceil
  }

  function calcNpr(netCents: bigint, fxMicro: bigint): bigint {
    return (netCents * fxMicro) / 1_000_000n; // floor (BigInt default)
  }

  it("gross $10.00 at 100 bps → fee 10¢, net 990¢, NPR 132,907 paisa", () => {
    const gross = 1_000n;
    const fee = calcFee(gross, FEE_BPS);
    expect(fee).toBe(10n);
    const net = gross - fee;
    expect(net).toBe(990n);
    const nprPaisa = calcNpr(net, FX_MICRO);
    // 990 × 134,250,000 / 1,000,000 = 132,907 (floor)
    expect(nprPaisa).toBe(132_907n);
  });

  it("gross $10.54 at 100 bps → fee 11¢ (ceil), net 1043¢, NPR 140,022 paisa (floor)", () => {
    const gross = 1_054n;
    const fee = calcFee(gross, FEE_BPS);
    // ceil(1054 × 100 / 10000) = ceil(10.54) = 11
    expect(fee).toBe(11n);
    const net = gross - fee;
    expect(net).toBe(1_043n);
    const nprPaisa = calcNpr(net, FX_MICRO);
    // 1043 × 134,250,000 / 1,000,000 = 140,022 (floor)
    expect(nprPaisa).toBe(140_022n);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Insert-only app tables
// ═══════════════════════════════════════════════════════════════════

describe("insert-only app tables", () => {
  it("UPDATE on bank_events is blocked by trigger", async () => {
    const id = uid();
    await ownerPool.query(
      `INSERT INTO bank_events (id, event_id, payload_hash, payload) VALUES ($1, $2, 'h', '{}')`,
      [id, uid()]
    );
    await expect(
      ownerPool.query(
        `UPDATE bank_events SET payload_hash = 'changed' WHERE id = $1`,
        [id]
      )
    ).rejects.toThrow(/immutable|blocked/i);
  });

  it("DELETE on audit_logs is blocked by trigger", async () => {
    const id = uid();
    await ownerPool.query(
      `INSERT INTO audit_logs (id, action) VALUES ($1, 'test')`,
      [id]
    );
    await expect(
      ownerPool.query(`DELETE FROM audit_logs WHERE id = $1`, [id])
    ).rejects.toThrow(/immutable|blocked/i);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. Settlement reversal — settled payment can be reversed
// ═══════════════════════════════════════════════════════════════════

describe("settlement reversal", () => {
  it("settled payment can be reversed; original entries survive (append-only)", async () => {
    const ext = await createAccount(appPool, uid(), "USD", true, false);
    const fees = await createAccount(appPool, uid(), "USD", false, true);
    const merchant = await createAccount(appPool, uid(), "USD", true, true);

    const paymentId = uid();

    // Original settlement — each leg is a separate create_transfer with
    // a unique step name, wrapped in a transaction for atomicity.
    const settleClient = await appPool.connect();
    try {
      await settleClient.query("BEGIN");
      await settleClient.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 10, now(), $3::jsonb)`,
        [ext, fees, JSON.stringify({ payment_id: paymentId, step: "settle_fee" })]
      );
      await settleClient.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 990, now(), $3::jsonb)`,
        [ext, merchant, JSON.stringify({ payment_id: paymentId, step: "settle_net" })]
      );
      await settleClient.query("COMMIT");
    } finally {
      settleClient.release();
    }

    // Verify balance
    const balBefore = await ownerPool.query(
      "SELECT balance::int FROM pgledger.pgledger_accounts WHERE id = $1",
      [merchant]
    );
    expect(balBefore.rows[0].balance).toBe(990);

    // Reversal — reverse BOTH legs atomically, unique step names
    const revClient = await appPool.connect();
    try {
      await revClient.query("BEGIN");
      await revClient.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 10, now(), $3::jsonb)`,
        [fees, ext, JSON.stringify({ payment_id: paymentId, step: "reversal_fee" })]
      );
      await revClient.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, 990, now(), $3::jsonb)`,
        [merchant, ext, JSON.stringify({ payment_id: paymentId, step: "reversal_net" })]
      );
      await revClient.query("COMMIT");
    } finally {
      revClient.release();
    }

    // Balance back to 0
    const balAfter = await ownerPool.query(
      "SELECT balance::int FROM pgledger.pgledger_accounts WHERE id = $1",
      [merchant]
    );
    expect(balAfter.rows[0].balance).toBe(0);

    // Original entries still exist (append-only): 2 settle + 2 reversal = 4 transfers
    const cnt = await ownerPool.query(
      `SELECT count(*)::int as cnt FROM pgledger.pgledger_transfers
       WHERE metadata->>'payment_id' = $1`,
      [paymentId]
    );
    expect(cnt.rows[0].cnt).toBe(4);
  });
});
