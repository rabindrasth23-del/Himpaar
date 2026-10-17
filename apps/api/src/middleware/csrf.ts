/**
 * CSRF protection: reject non-GET requests whose Origin header
 * does not match the configured WEB_URL.
 *
 * This is a simple origin-based check, not a token-based CSRF mechanism.
 * Combined with SameSite=Lax cookies, this provides adequate protection.
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../config/env.js";
import { HimpaarError } from "../lib/errors.js";

export async function csrfCheck(request: FastifyRequest, _reply: FastifyReply) {
  // Only check state-changing methods
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return;
  }

  const env = getEnv();
  const origin = request.headers.origin;

  // In development, allow requests without an Origin header (e.g. curl, Postman)
  if (!origin && env.NODE_ENV === "development") {
    return;
  }

  if (!origin) {
    throw new HimpaarError(403, "CSRF_REJECTED", "Missing Origin header.");
  }

  // Compare origins
  const allowed = new URL(env.WEB_URL).origin;
  const incoming = new URL(origin).origin;

  if (incoming !== allowed) {
    throw new HimpaarError(403, "CSRF_REJECTED", "Origin header does not match the allowed origin.");
  }
}
