// Scratch: inspect test DB state and verify trigger behavior
import "dotenv/config";
import pg from "pg";

const c = new pg.Client({ connectionString: process.env["DATABASE_TEST_URL"] });
await c.connect();

// 1. What accounts exist?
const accts = await c.query(
  "SELECT id, name, balance FROM pgledger.pgledger_accounts LIMIT 10"
);
console.log("ACCOUNTS:", JSON.stringify(accts.rows, null, 2));

// 2. Counts
const tr = await c.query("SELECT count(*) FROM pgledger.pgledger_transfers");
console.log("TRANSFERS:", tr.rows[0].count);
const en = await c.query("SELECT count(*) FROM pgledger.pgledger_entries");
console.log("ENTRIES:", en.rows[0].count);

// 3. Try UPDATE on transfers (0-row match)
try {
  const r = await c.query(
    "UPDATE pgledger.pgledger_transfers SET amount = 0 WHERE id = 'nonexistent'"
  );
  console.log("UPDATE transfers (0-row):", r.rowCount, "rows — trigger DID NOT fire");
} catch (e: unknown) {
  console.log("UPDATE transfers error:", (e as Error).message);
}

// 4. Create accounts + transfer, then try mutations
try { await c.query("SELECT pgledger.pgledger_create_account('_probe_a', 'USD', true, true)"); } catch { /* already exists from prev run */ }
try { await c.query("SELECT pgledger.pgledger_create_account('_probe_b', 'USD', true, true)"); } catch { /* already exists */ }

const xfer = await c.query(
  "SELECT pgledger.pgledger_create_transfer('_probe_a', '_probe_b', 100, now(), '{}'::jsonb)"
);
console.log("Created transfer:", JSON.stringify(xfer.rows[0]));

// Now try UPDATE on a real row
try {
  await c.query("UPDATE pgledger.pgledger_transfers SET amount = 0 WHERE from_account_id = '_probe_a'");
  console.log("UPDATE real transfer: succeeded (BAD — trigger should block)");
} catch (e: unknown) {
  console.log("UPDATE real transfer blocked:", (e as Error).message);
}

// Try DELETE on real entry
try {
  await c.query("DELETE FROM pgledger.pgledger_entries WHERE account_id = '_probe_a'");
  console.log("DELETE real entry: succeeded (BAD — trigger should block)");
} catch (e: unknown) {
  console.log("DELETE real entry blocked:", (e as Error).message);
}

// 5. Check what the account id looks like (id vs name)
const probeAcct = await c.query(
  "SELECT id, name FROM pgledger.pgledger_accounts WHERE name = '_probe_a'"
);
console.log("Probe account:", JSON.stringify(probeAcct.rows[0]));

await c.end();
