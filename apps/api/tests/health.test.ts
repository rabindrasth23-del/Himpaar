import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// Set required env vars before importing buildApp (which calls getEnv)
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";
process.env["SANDBOX_MODE"] = "true";
process.env["SESSION_SECRET"] =
  "test-secret-that-is-at-least-32-characters-long-for-validation";
process.env["SIMULATOR_WEBHOOK_SECRET"] = "whsec_test_secret";
process.env["WEB_URL"] = "http://localhost:5173";
process.env["API_URL"] = "http://localhost:4000";
process.env["UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO"] = "134250000";
process.env["UNVERIFIED_DEMO_FEE_BPS"] = "100";

const { buildApp } = await import("../src/app.js");

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns status ok", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
