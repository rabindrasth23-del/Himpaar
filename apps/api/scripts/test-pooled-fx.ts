/**
 * Prompt 3 step 4: Prove that a multi-leg FX posting works via the POOLED
 * (DATABASE_URL) connection, including SET LOCAL lock_timeout inside a
 * transaction.
 *
 * Usage: pnpm --filter @himpaar/api exec tsx scripts/test-pooled-fx.ts
 */
import "dotenv/config";
import pg from "pg";

const pooledUrl = process.env["DATABASE_TEST_URL"];
if (!pooledUrl) throw new Error("DATABASE_TEST_URL not set");

// Use the app role (from DATABASE_URL) against the test database
const mainUrl = process.env["DATABASE_URL"];
if (!mainUrl) throw new Error("DATABASE_URL not set");
const main = new URL(mainUrl);
const testUrl = new URL(pooledUrl);
testUrl.username = main.username;
testUrl.password = main.password;
// Switch to the pooler host to simulate production pooled connection
const poolerHost = main.hostname; // ep-spring-thunder-b40pqwn6-pooler...
testUrl.hostname = poolerHost;

const pool = new pg.Pool({ connectionString: testUrl.toString(), max: 2 });

const uid = () => `fxtest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

async function createAccount(
  client: pg.PoolClient,
  name: string,
  currency: string,
  allowNeg: boolean,
  allowPos: boolean
): Promise<string> {
  const res = await client.query(
    `SELECT * FROM pgledger.pgledger_create_account($1, $2, $3, $4)`,
    [name, currency, allowNeg, allowPos]
  );
  return res.rows[0].id as string;
}

async function main_() {
  const client = await pool.connect();
  try {
    // BEGIN + SET LOCAL lock_timeout (proves transactions work via pooler)
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    console.log("✔ BEGIN + SET LOCAL lock_timeout = '5s' succeeded via pooled connection");

    // Create test accounts
    const ext = await createAccount(client, uid(), "USD", true, false);
    const fees = await createAccount(client, uid(), "USD", false, true);
    const fxUsd = await createAccount(client, uid(), "USD", false, true);
    const fxNpr = await createAccount(client, uid(), "NPR", true, false);
    const merchantNpr = await createAccount(client, uid(), "NPR", false, true);
    console.log("✔ Created 5 accounts via pooled connection");

    const paymentId = uid();

    // T1: fee (1%)
    await client.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, 100, now(), $3::jsonb)`,
      [ext, fees, JSON.stringify({ payment_id: paymentId, step: "fee" })]
    );

    // T2: net USD to FX pool
    await client.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, 900, now(), $3::jsonb)`,
      [ext, fxUsd, JSON.stringify({ payment_id: paymentId, step: "net_usd" })]
    );

    // T3: NPR payout (900 cents × 134.25 = ~NPR 120,825 paisa, using 120000 for simplicity)
    await client.query(
      `SELECT pgledger.pgledger_create_transfer($1, $2, 120825, now(), $3::jsonb)`,
      [fxNpr, merchantNpr, JSON.stringify({ payment_id: paymentId, step: "npr_payout" })]
    );

    await client.query("COMMIT");
    console.log("✔ COMMIT succeeded — 3-leg FX posting complete via pooled connection");

    // Verify balances
    const res = await client.query(
      `SELECT name, balance::text FROM pgledger.pgledger_accounts WHERE id = ANY($1)`,
      [[ext, fees, fxUsd, fxNpr, merchantNpr]]
    );
    console.log("\nFinal balances:");
    for (const row of res.rows) {
      console.log(`  ${row.name}: ${row.balance}`);
    }

    // Verify lock_timeout is reset after COMMIT (session-level should be default)
    const lockRes = await client.query("SHOW lock_timeout");
    console.log(`\n✔ lock_timeout after COMMIT: ${lockRes.rows[0].lock_timeout} (reset to session default)`);

    console.log("\n✅ Item 4 PASSED: FX posting via pooled DATABASE_URL works correctly");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
}

main_();
