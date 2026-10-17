/**
 * Session middleware — validates the session cookie, extends idle expiry,
 * and attaches `request.merchant` and `request.session` to the Fastify request.
 *
 * Sessions are stored in Postgres (sessions table):
 * - tokenHash: SHA-256 of a 32-byte random token stored as httpOnly cookie
 * - absoluteExpiry: 7 days from creation (hard cap)
 * - idleExpiry: 24 hours from last activity (extended on each request)
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { getPrisma } from "../config/prisma.js";
import { sha256 } from "../lib/crypto.js";
import { HimpaarError } from "../lib/errors.js";

const SESSION_COOKIE = "himpaar.sid";
const IDLE_HOURS = 24;

// Extend Fastify request with merchant info
declare module "fastify" {
  interface FastifyRequest {
    merchantId?: string;
    merchantEmail?: string;
    sessionId?: string;
  }
}

/** Hook that requires authentication. Returns 401 if no valid session. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) {
    throw new HimpaarError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const hash = sha256(token);
  const prisma = getPrisma();
  const now = new Date();

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hash,
      absoluteExpiry: { gt: now },
      idleExpiry: { gt: now },
    },
    include: { merchant: true },
  });

  if (!session) {
    // Clear the stale cookie
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    throw new HimpaarError(401, "SESSION_EXPIRED", "Your session has expired. Please log in again.");
  }

  // Extend idle expiry
  const newIdle = new Date(now.getTime() + IDLE_HOURS * 60 * 60 * 1000);
  await prisma.session.update({
    where: { id: session.id },
    data: { idleExpiry: newIdle },
  });

  request.merchantId = session.merchantId;
  request.merchantEmail = session.merchant.email;
  request.sessionId = session.id;
}

/** Set the session cookie on reply. */
export function setSessionCookie(reply: FastifyReply, token: string, isProduction: boolean) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60, // 7 days (matches absolute expiry)
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export { SESSION_COOKIE };
