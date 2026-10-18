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

  // Bearer API-key requests are not cookie-authenticated, so CSRF does not apply (TRD §10).
  const authz = request.headers.authorization;
  if (typeof authz === "string" && authz.startsWith("Bearer ")) {
    return;
  }

  // Requests carrying a body must be JSON — blocks simple-form cross-site POSTs.
  const hasBody =
    (request.headers["content-length"] !== undefined && request.headers["content-length"] !== "0") ||
    request.headers["transfer-encoding"] !== undefined;
  if (hasBody) {
    const ct = (request.headers["content-type"] ?? "").toLowerCase();
    if (!ct.startsWith("application/json")) {
      throw new HimpaarError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
    }
  }

  const env = getEnv();
  // Prefer Origin; fall back to Referer when Origin is absent.
  const source = request.headers.origin ?? request.headers.referer;

  // In development, allow requests with neither header (e.g. curl, Postman)
  if (!source && env.NODE_ENV === "development") {
    return;
  }

  if (!source) {
    throw new HimpaarError(403, "CSRF_REJECTED", "Missing Origin header.");
  }

  let incoming: string;
  try {
    incoming = new URL(source).origin;
  } catch {
    throw new HimpaarError(403, "CSRF_REJECTED", "Malformed Origin header.");
  }

  const allowed = new URL(env.WEB_URL).origin;
  if (incoming !== allowed) {
    throw new HimpaarError(403, "CSRF_REJECTED", "Origin header does not match the allowed origin.");
  }
}
