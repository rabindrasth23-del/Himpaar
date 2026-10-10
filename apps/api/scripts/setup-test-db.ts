// Creates the himpaar_test database on Neon, applies migrations, sets up the
// app role. Run once before the first test run.
//
// Usage: pnpm --filter @himpaar/api exec tsx scripts/setup-test-db.ts
import "dotenv/config";
import pg from "pg";
import { execSync } from "node:child_process";

const migrateUrl = process.env["DATABASE_MIGRATE_URL"];
if (!migrateUrl) throw new Error("DATABASE_MIGRATE_URL not set");

// Connect to 'neondb' (the default database) to create himpaar_test
const adminUrl = new URL(migrateUrl);
const owner = new pg.Client({ connectionString: adminUrl.toString() });
await owner.connect();

// Create the test database (idempotent)
const { rows } = await owner.query(
  "SELECT 1 FROM pg_database WHERE datname = 'himpaar_test'"
);
if (rows.length === 0) {
  await owner.query("CREATE DATABASE himpaar_test");
  console.log("✔ Created database himpaar_test");
} else {
  console.log("✔ Database himpaar_test already exists");
}
await owner.end();

// Build the test URL (same host, different database)
const testUrl = new URL(migrateUrl);
testUrl.pathname = "/himpaar_test";
const testUrlStr = testUrl.toString();
console.log(`  DATABASE_TEST_URL = ${testUrlStr.replace(/:[^:@/]+@/, ':***@')}`);

// Apply migrations to the test database
console.log("  Applying migrations...");
execSync(
  `npx prisma migrate deploy`,
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_MIGRATE_URL: testUrlStr,
      DATABASE_URL: testUrlStr,
    },
  }
);
console.log("✔ Migrations applied to himpaar_test");

// Set up himpaar_app role on the test database
const testOwner = new pg.Client({ connectionString: testUrlStr });
await testOwner.connect();

// Create role if it doesn't exist (idempotent)
const roleCheck = await testOwner.query(
  "SELECT 1 FROM pg_roles WHERE rolname = 'himpaar_app'"
);
if (roleCheck.rows.length === 0) {
  await testOwner.query("CREATE ROLE himpaar_app LOGIN");
}

// Set password from DATABASE_URL (the app role password)
const appUrl = process.env["DATABASE_URL"];
if (appUrl) {
  const appPw = decodeURIComponent(new URL(appUrl).password);
  await testOwner.query(
    `ALTER ROLE himpaar_app WITH LOGIN PASSWORD ${pg.escapeLiteral(appPw)}`
  );
}

// Grant CONNECT
await testOwner.query(
  `GRANT CONNECT ON DATABASE himpaar_test TO himpaar_app`
);
await testOwner.end();

console.log("✔ himpaar_app role configured on himpaar_test");

// Write out the test URL for the user to add to .env
console.log("\nAdd this to apps/api/.env:");
console.log(`DATABASE_TEST_URL=${testUrlStr.replace(/:[^:@/]+@/, ':***@')}`);
console.log("(with the real password)");
