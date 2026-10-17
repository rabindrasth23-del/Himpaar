/**
 * Crypto helpers for the API server.
 * - Session tokens: 32 bytes of crypto-random, Base64-URL encoded
 * - SHA-256 hashing (for session tokens and API keys)
 * - Payment link tokens: 128-bit (16 bytes) random, hex-encoded (32 chars)
 * - Request ID: compact unique ID for error responses
 */
import { randomBytes, createHash, randomUUID } from "node:crypto";

/** 32-byte random session token, Base64-URL encoded (no padding). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hash of a string, hex-encoded. */
export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** 128-bit (16-byte) random token for payment links, hex-encoded. */
export function generatePaymentLinkToken(): string {
  return randomBytes(16).toString("hex");
}

/** Compact request ID for error responses. */
export function requestId(): string {
  return randomUUID();
}

/** Generate a random API key: "hp_test_" + 32 random bytes as base64url. */
export function generateApiKey(): { fullKey: string; prefix: string } {
  const raw = randomBytes(32).toString("base64url");
  const fullKey = `hp_test_${raw}`;
  const prefix = fullKey.slice(0, 12);
  return { fullKey, prefix };
}
