import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Load .env so tests can read DATABASE_TEST_URL etc.
    env: loadEnvToRecord(),
    // Longer timeout for network round-trips to Neon
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Include files under tests/
    include: ["tests/**/*.test.ts"],
  },
});

/** Read .env and return a plain Record for Vitest's env option. */
function loadEnvToRecord(): Record<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const envPath = path.resolve(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return env;
}
