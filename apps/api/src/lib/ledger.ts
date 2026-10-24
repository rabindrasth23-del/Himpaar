/**
 * Double-entry ledger integration (TRD §5).
 *
 * Uses Prisma interactive transactions with $queryRaw to call pgledger
 * SQL functions. This ensures ledger writes and app writes commit together
 * in one database transaction, as specified in TRD §4.
 *
 * Each successful payment posts four transfers (1-4) atomically with the
 * Payment, Settlement, and Document rows. Transfer 5 (settlement payout)
 * posts separately when the Settlement moves pending → settled.
 *
 * Transfer plan:
 *   1. USD receipt:   platform:usd:external → merchant:<id>:usd  (gross)
 *   2. Fee:           merchant:<id>:usd     → platform:usd:fees   (fee)
 *   3. FX out:        merchant:<id>:usd     → platform:fx:usd     (net USD)
 *   4. FX in:         platform:fx:npr       → merchant:<id>:npr   (net NPR)
 *   5. Settlement:    merchant:<id>:npr     → platform:npr:bank   (net NPR)
 *      ↑ posted only when settlement status = settled, not at payment time.
 *
 * Merchant accounts are created lazily (once per merchant per currency).
 * Idempotency is guaranteed by pgledger's unique constraint on
 * (metadata->>'payment_id', metadata->>'step').
 */
import type { PrismaClient } from "../../generated/prisma/client.js";

// The Prisma transaction client type — same as PrismaClient but within $transaction.
// Prisma 7's $transaction callback receives this type.
type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// ── Account lookup / creation ────────────────────────────────────────────

/** Cache of account name → pgledger account id. */
const accountIdCache = new Map<string, string>();

async function ensureAccount(
  tx: TxClient,
  name: string,
  currency: string,
  allowNeg: boolean,
  allowPos: boolean,
): Promise<string> {
  const cached = accountIdCache.get(name);
  if (cached) return cached;

  // Try to find existing account first
  const existing: Array<{ id: string }> = await tx.$queryRaw`
    SELECT id FROM pgledger.pgledger_accounts WHERE name = ${name}
  `;
  if (existing.length > 0 && existing[0]) {
    const id = existing[0].id;
    accountIdCache.set(name, id);
    return id;
  }

  // Create it
  const created: Array<{ id: string }> = await tx.$queryRaw`
    SELECT * FROM pgledger.pgledger_create_account(
      ${name}, ${currency}, ${allowNeg}, ${allowPos}
    )
  `;
  if (!created[0]) throw new Error(`pgledger_create_account returned no rows for ${name}`);
  const id = created[0].id;
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

// ── Post transfers 1-4 (payment success) ─────────────────────────────────

/**
 * Post the first four ledger transfers inside a Prisma interactive transaction.
 * Called within the same $transaction that creates the Payment, Settlement,
 * and Document rows. Transfer 5 is NOT posted here.
 */
export async function postPaymentTransfers(
  tx: TxClient,
  opts: {
    paymentId: string;
    merchantId: string;
    grossUsdCents: bigint;
    feeUsdCents: bigint;
    netUsdCents: bigint;
    netNprPaisa: bigint;
    at: Date;
  },
): Promise<void> {
  // Ensure merchant accounts exist
  const mUsd = await ensureAccount(tx, merchantUsd(opts.merchantId), "USD", false, true);
  const mNpr = await ensureAccount(tx, merchantNpr(opts.merchantId), "NPR", false, true);

  // Resolve platform accounts
  const external = await ensureAccount(tx, PLATFORM.external, "USD", true, false);
  const fees = await ensureAccount(tx, PLATFORM.fees, "USD", false, true);
  const fxUsd = await ensureAccount(tx, PLATFORM.fxUsd, "USD", false, true);
  const fxNpr = await ensureAccount(tx, PLATFORM.fxNpr, "NPR", true, false);

  const pid = opts.paymentId;
  const ts = opts.at.toISOString();

  // pgledger amounts are NUMERIC (positive); amounts are in minor units.
  // We convert BigInt to string for safe transfer to SQL NUMERIC.
  const gross = opts.grossUsdCents.toString();
  const fee = opts.feeUsdCents.toString();
  const netUsd = opts.netUsdCents.toString();
  const netNpr = opts.netNprPaisa.toString();

  // 1. USD receipt: external → merchant:usd
  await tx.$queryRaw`
    SELECT pgledger.pgledger_create_transfer(
      ${external}, ${mUsd}, ${gross}::NUMERIC, ${ts}::TIMESTAMPTZ,
      ${JSON.stringify({ payment_id: pid, step: "usd_receipt" })}::JSONB
    )
  `;

  // 2. Fee: merchant:usd → fees
  if (opts.feeUsdCents > 0n) {
    await tx.$queryRaw`
      SELECT pgledger.pgledger_create_transfer(
        ${mUsd}, ${fees}, ${fee}::NUMERIC, ${ts}::TIMESTAMPTZ,
        ${JSON.stringify({ payment_id: pid, step: "fee" })}::JSONB
      )
    `;
  }

  // 3. FX out: merchant:usd → fx:usd
  await tx.$queryRaw`
    SELECT pgledger.pgledger_create_transfer(
      ${mUsd}, ${fxUsd}, ${netUsd}::NUMERIC, ${ts}::TIMESTAMPTZ,
      ${JSON.stringify({ payment_id: pid, step: "fx_usd_out" })}::JSONB
    )
  `;

  // 4. FX in: fx:npr → merchant:npr
  await tx.$queryRaw`
    SELECT pgledger.pgledger_create_transfer(
      ${fxNpr}, ${mNpr}, ${netNpr}::NUMERIC, ${ts}::TIMESTAMPTZ,
      ${JSON.stringify({ payment_id: pid, step: "fx_npr_in" })}::JSONB
    )
  `;
}

// ── Post transfer 5 (settlement payout) ──────────────────────────────────

/**
 * Post the fifth ledger transfer when a settlement moves pending → settled.
 * Called within its own Prisma interactive transaction with the Settlement
 * row locked via SELECT ... FOR UPDATE.
 */
export async function postSettlementTransfer(
  tx: TxClient,
  opts: {
    paymentId: string;
    merchantId: string;
    netNprPaisa: bigint;
    at: Date;
  },
): Promise<void> {
  const mNpr = await ensureAccount(tx, merchantNpr(opts.merchantId), "NPR", false, true);
  const nprBank = await ensureAccount(tx, PLATFORM.nprBank, "NPR", false, true);

  const pid = opts.paymentId;
  const ts = opts.at.toISOString();
  const netNpr = opts.netNprPaisa.toString();

  // 5. Settlement: merchant:npr → npr:bank
  await tx.$queryRaw`
    SELECT pgledger.pgledger_create_transfer(
      ${mNpr}, ${nprBank}, ${netNpr}::NUMERIC, ${ts}::TIMESTAMPTZ,
      ${JSON.stringify({ payment_id: pid, step: "settlement" })}::JSONB
    )
  `;
}

/** Clear the account ID cache (for testing). */
export function clearAccountCache(): void {
  accountIdCache.clear();
}

export { PLATFORM, merchantUsd, merchantNpr };
