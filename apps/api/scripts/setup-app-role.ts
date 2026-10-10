// Sets the himpaar_app role password from DATABASE_URL, then verifies the
// role's privileges. Run after `prisma migrate deploy` on any new database
// (e.g. a fresh Neon branch). Uses DATABASE_MIGRATE_URL (owner) to ALTER ROLE.
//
// Usage: pnpm --filter @himpaar/api exec tsx scripts/setup-app-role.ts
import "dotenv/config";
import pg from "pg";

const migrateUrl = process.env["DATABASE_MIGRATE_URL"];
const appUrl = process.env["DATABASE_URL"];
if (!migrateUrl || !appUrl) {
  throw new Error("DATABASE_MIGRATE_URL and DATABASE_URL must both be set");
}

const appPassword = decodeURIComponent(new URL(appUrl).password);
if (appPassword.length < 16) {
  throw new Error("himpaar_app password in DATABASE_URL must be at least 16 characters");
}

async function main(): Promise<void> {
  // 1. Owner sets the password (secrets never live in migrations)
  const owner = new pg.Client({ connectionString: migrateUrl });
  await owner.connect();
  await owner.query(`ALTER ROLE himpaar_app WITH LOGIN PASSWORD ${pg.escapeLiteral(appPassword)}`);
  await owner.end();
  console.log("✔ himpaar_app password set");

  // 2. Verify as the app role
  const app = new pg.Client({ connectionString: appUrl });
  await app.connect();
  const checks: Array<[string, () => Promise<unknown>, boolean]> = [
    ["read public.merchants", () => app.query("SELECT count(*) FROM merchants"), true],
    ["read pgledger accounts", () => app.query("SELECT count(*) FROM pgledger.pgledger_accounts"), true],
    ["direct INSERT into pgledger_entries is blocked", () =>
      app.query("INSERT INTO pgledger.pgledger_entries DEFAULT VALUES"), false],
    ["DDL in public is blocked", () => app.query("CREATE TABLE should_fail (id int)"), false],
  ];

  let failed = 0;
  for (const [label, run, shouldSucceed] of checks) {
    let ok: boolean;
    try {
      await run();
      ok = shouldSucceed;
    } catch {
      ok = !shouldSucceed;
    }
    console.log(`${ok ? "✔" : "✘"} ${label}`);
    if (!ok) failed++;
  }
  await app.end();

  if (failed > 0) {
    throw new Error(`${failed} privilege check(s) failed`);
  }
  console.log("✔ all privilege checks passed");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
