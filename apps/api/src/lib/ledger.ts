/**
 * Double-entry ledger integration (TRD §5).
 *
 * Uses pgledger's SQL functions directly via the pg pool that backs Prisma.
 * Each successful payment posts five transfers in a single transaction:
 *
 *   1. USD receipt:   external    → merchant:usd  (gross)
 *   2. Fee:           merchant:usd → fees          (fee)
 *   3. FX out:        merchant:usd → fx:usd        (net USD)
 *   4. FX in:         fx:npr       → merchant:npr   (net NPR)
 *   5. Settlement:    merchant:npr → npr:bank       (net NPR)
 *
 * Merchant accounts are created lazily (once per merchant per currency).
 * Idempotency is guaranteed by the unique index on
 * (metadata->>'payment_id', metadata->>'step').
 */
import pg from "pg";
import { getEnv } from "../config/env.js";

let _pool: pg.Pool | undefined;

/** Shared pool — same connection string as Prisma, separate pool for raw SQL. */
function getPool(): pg.Pool {
  if (_pool) return _pool;
  _pool = new pg.Pool({ connectionString: getEnv().DATABASE_URL, max: 5 });
  return _pool;
}

/** Shut down the pool (called on graceful shutdown). */
export function closeLedgerPool(): Promise<void> {
  if (!_pool) return Promise.resolve();
  return _pool.end();
}

// ── Account lookup / creation ────────────────────────────────────────────

/** Cache of account name → pgledger account id. */
const accountIdCache = new Map<string, string>();

async function ensureAccount(
  client: pg.PoolClient,
  name: string,
  currency: string,
  allowNeg: boolean,
  allowPos: boolean,
): Promise<string> {
  const cached = accountIdCache.get(name);
  if (cached) return cached;

  // Try to find existing account first
  const existing = await client.query(
    `SELECT id FROM pgledger.pgledger_accounts WHERE name = $1`,
    [name],
  );
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id as string;
    accountIdCache.set(name, id);
    return id;
  }

  // Create it
  const created = await client.query(
    `SELECT * FROM pgledger.pgledger_create_account($1, $2, $3, $4)`,
    [name, currency, allowNeg, allowPos],
  );
  const id = created.rows[0].id as string;
  accountIdCache.set(name, id);
  return id;
}

// ── Platform account names (seeded in migration 20261009) ────────────────

const PLATFORM = {
  external: "platform:usd:external",
  fees: "platform:usd:fees",
  fxUsd: "platform:fx:usd",
  fxNpr: "platform:fx:npr",
  nprBank: "platform:npr:bank",
} as const;

function merchantUsd(merchantId: string) {
  return `merchant:${merchantId}:usd`;
}
function merchantNpr(merchantId: string) {
  return `merchant:${merchantId}:npr`;
}

// ── Post the five ledger legs ────────────────────────────────────────────

export async function postPaymentLedgerEntries(opts: {
  paymentId: string;
  merchantId: string;
  grossUsdCents: bigint;
  feeUsdCents: bigint;
  netUsdCents: bigint;
  netNprPaisa: bigint;
  at: Date;
}): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure merchant accounts exist
    const mUsd = await ensureAccount(client, merchantUsd(opts.merchantId), "USD", false, true);
    const mNpr = await ensureAccount(client, merchantNpr(opts.merchantId), "NPR", false, true);

    // Resolve platform accounts
    const external = await ensureAccount(client, PLATFORM.external, "USD", true, false);
    const fees = await ensureAccount(client, PLATFORM.fees, "USD", false, true);
    const fxUsd = await ensureAccount(client, PLATFORM.fxUsd, "USD", false, true);
    const fxNpr = await ensureAccount(client, PLATFORM.fxNpr, "NPR", true, false);
    const nprBank = await ensureAccount(client, PLATFORM.nprBank, "NPR", false, true);

    const pid = opts.paymentId;
    const ts = opts.at.toISOString();

    // pgledger amounts are NUMERIC (positive); amounts are in minor units.
    // We convert BigInt to string for safe transfer to SQL NUMERIC.
    const gross = opts.grossUsdCents.toString();
    const fee = opts.feeUsdCents.toString();
    const netUsd = opts.netUsdCents.toString();
    const netNpr = opts.netNprPaisa.toString();

    // 1. USD receipt: external → merchant:usd
    await client.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, $3::NUMERIC, $4::TIMESTAMPTZ, $5::JSONB)`,
      [external, mUsd, gross, ts, JSON.stringify({ payment_id: pid, step: "usd_receipt" })],
    );

    // 2. Fee: merchant:usd → fees
    if (opts.feeUsdCents > 0n) {
      await client.query(
        `SELECT pgledger.pgledger_create_transfer($1, $2, $3::NUMERIC, $4::TIMESTAMPTZ, $5::JSONB)`,
        [mUsd, fees, fee, ts, JSON.stringify({ payment_id: pid, step: "fee" })],
      );
    }

    // 3. FX out: merchant:usd → fx:usd
    await client.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, $3::NUMERIC, $4::TIMESTAMPTZ, $5::JSONB)`,
      [mUsd, fxUsd, netUsd, ts, JSON.stringify({ payment_id: pid, step: "fx_usd_out" })],
    );

    // 4. FX in: fx:npr → merchant:npr
    await client.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, $3::NUMERIC, $4::TIMESTAMPTZ, $5::JSONB)`,
      [fxNpr, mNpr, netNpr, ts, JSON.stringify({ payment_id: pid, step: "fx_npr_in" })],
    );

    // 5. Settlement: merchant:npr → npr:bank
    await client.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, $3::NUMERIC, $4::TIMESTAMPTZ, $5::JSONB)`,
      [mNpr, nprBank, netNpr, ts, JSON.stringify({ payment_id: pid, step: "settlement" })],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
