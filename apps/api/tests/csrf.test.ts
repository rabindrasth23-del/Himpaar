import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

/**
 * CSRF middleware tests — verifies all the rules in TRD §10.
 *
 * We use fastify.inject() which never opens a real port. The CSRF middleware
 * checks Origin / Referer / Content-Type / Bearer, so we exercise each path.
 */

// Set env before importing buildApp (getEnv caches)
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

describe("CSRF middleware", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper: POST /v1/auth/signup is a convenient state-changing endpoint
  const postSignup = (headers: Record<string, string>) =>
    app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      payload: JSON.stringify({
        name: "Test",
        email: "csrf-test@example.com",
        password: "Str0ngP@ss!",
      }),
    });

  it("allows GET requests without Origin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(res.statusCode).toBe(200);
  });

  it("allows POST with correct Origin", async () => {
    const res = await postSignup({ origin: "http://localhost:5173" });
    // Might 500 (no real DB) but should NOT be 403 CSRF
    expect(res.statusCode).not.toBe(403);
  });

  it("rejects POST with wrong Origin → 403", async () => {
    const res = await postSignup({ origin: "http://evil.com" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("CSRF_REJECTED");
  });

  it("falls back to Referer when Origin is absent", async () => {
    const res = await postSignup({ referer: "http://localhost:5173/dashboard" });
    expect(res.statusCode).not.toBe(403);
  });

  it("rejects POST with wrong Referer → 403", async () => {
    const res = await postSignup({ referer: "http://evil.com/hack" });
    expect(res.statusCode).toBe(403);
  });

  it("rejects non-JSON Content-Type on POST with body → 415", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      headers: {
        origin: "http://localhost:5173",
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: "name=Test&email=test%40x.com&password=pass",
    });
    expect(res.statusCode).toBe(415);
  });

  it("allows Bearer token requests without Origin (API key bypass)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/api-keys",
      headers: {
        authorization: "Bearer hk_live_testkey1234567890",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ name: "test" }),
    });
    // Will fail auth (invalid key) but should NOT be 403 CSRF
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).not.toBe(415);
  });

  it("rejects POST with malformed Origin → 403", async () => {
    const res = await postSignup({ origin: "not-a-url" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("CSRF_REJECTED");
  });
});
