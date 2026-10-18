/**
 * Payment link routes — CRUD + public lookup by token.
 *
 * POST /v1/payment-links (idempotent, requires Idempotency-Key header)
 * GET  /v1/payment-links (list for merchant)
 * GET  /v1/payment-links/:id (detail)
 * GET  /v1/public/payment-links/:token (public payer page lookup)
 */
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { CreatePaymentLinkRequestSchema } from "@himpaar/shared";
import { getPrisma } from "../config/prisma.js";
import { getEnv } from "../config/env.js";
import { generatePaymentLinkToken, sha256 } from "../lib/crypto.js";
import { HimpaarError } from "../lib/errors.js";
import { requireAuth } from "../middleware/session.js";

/** Convert a YYYY-MM-DD due date to an expiry DateTime at end of day Nepal time. */
function dueDateToExpiry(dueDate: string): Date {
  // Due date is a calendar date. Expire at end of day in Nepal (UTC+5:45).
  const d = new Date(`${dueDate}T23:59:59+05:45`);
  return d;
}

/** Convert BigInt cents to the API's string minor-units format. */
function bigIntToMinor(n: bigint): string {
  return n.toString();
}

/** Map a Prisma PaymentLink to the API response shape. */
function toPaymentLinkDto(link: {
  id: string;
  token: string;
  amount: bigint;
  currency: string;
  status: string;
  description: string | null;
  clientName: string | null;
  clientEmail: string | null;
  createdAt: Date;
  expiresAt: Date;
  paidAt: Date | null;
  expiredAt: Date | null;
  cancelledAt: Date | null;
  merchantId: string;
}, env: ReturnType<typeof getEnv>) {
  const refNum = link.id.slice(-8).toUpperCase();
  return {
    id: link.id,
    token: link.token,
    url: `${env.WEB_URL}/pay/${link.token}`,
    reference: `PL-${refNum}`,
    amount: {
      amount_minor: bigIntToMinor(link.amount),
      currency: link.currency,
    },
    description: link.description ?? "",
    client_name: link.clientName ?? "",
    // Legacy rows predate the column; fall back to a valid placeholder so the shared schema parses.
    client_email: link.clientEmail ?? "unknown@example.invalid",
    due_date: link.expiresAt.toISOString().slice(0, 10),
    status: link.status,
    created_at: link.createdAt.toISOString(),
    expires_at: link.expiresAt.toISOString(),
    paid_at: link.paidAt?.toISOString() ?? null,
    expired_at: link.expiredAt?.toISOString() ?? null,
    cancelled_at: link.cancelledAt?.toISOString() ?? null,
  };
}

const paymentLinkRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /v1/payment-links
  app.post("/v1/payment-links", {
    schema: {
      body: CreatePaymentLinkRequestSchema,
      headers: z.object({
        "idempotency-key": z.string().min(1).max(128),
      }).passthrough(),
    },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const prisma = getPrisma();
    const env = getEnv();
    const merchantId = request.merchantId!;
    const idempotencyKey = request.headers["idempotency-key"] as string;
    const body = request.body;

    // Check idempotency
    const requestHash = sha256(JSON.stringify(body));
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { merchantId_key: { merchantId, key: idempotencyKey } },
    });

    if (existing) {
      // If the request hash matches, return the cached response
      if (existing.requestHash === requestHash) {
        return reply.status(200).send(existing.response);
      }
      // Different request body with same key — conflict
      throw new HimpaarError(409, "IDEMPOTENCY_CONFLICT",
        "A different request was already sent with this Idempotency-Key.");
    }

    // Parse amount from Money object
    const amountCents = BigInt(body.amount.amount_minor);
    if (amountCents <= 0n) {
      throw new HimpaarError(400, "INVALID_AMOUNT", "Amount must be positive.");
    }

    const token = generatePaymentLinkToken();
    const expiresAt = dueDateToExpiry(body.due_date);

    const link = await prisma.paymentLink.create({
      data: {
        merchantId,
        token,
        amount: amountCents,
        currency: body.amount.currency,
        description: body.description,
        clientName: body.client_name,
        clientEmail: body.client_email,
        expiresAt,
        status: "open",
      },
    });

    const dto = toPaymentLinkDto(link, env);
    dto.due_date = body.due_date;

    // Store idempotency record
    await prisma.idempotencyRecord.create({
      data: {
        merchantId,
        key: idempotencyKey,
        requestHash,
        response: JSON.parse(JSON.stringify(dto)),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: "payment_link_create",
        details: { linkId: link.id, amount: amountCents.toString(), currency: body.amount.currency },
        ipAddress: request.ip,
      },
    });

    return reply.status(201).send(dto);
  });

  // GET /v1/payment-links
  app.get("/v1/payment-links", {
    preHandler: [requireAuth],
  }, async (request) => {
    const prisma = getPrisma();
    const env = getEnv();
    const links = await prisma.paymentLink.findMany({
      where: { merchantId: request.merchantId! },
      orderBy: { createdAt: "desc" },
    });

    return { data: links.map((l: typeof links[number]) => toPaymentLinkDto(l, env)) };
  });

  // GET /v1/payment-links/:id
  app.get("/v1/payment-links/:id", {
    schema: {
      params: z.object({ id: z.string() }),
    },
    preHandler: [requireAuth],
  }, async (request) => {
    const prisma = getPrisma();
    const env = getEnv();
    const link = await prisma.paymentLink.findFirst({
      where: { id: request.params.id, merchantId: request.merchantId! },
    });

    if (!link) {
      throw new HimpaarError(404, "NOT_FOUND", "Payment link not found.");
    }

    return toPaymentLinkDto(link, env);
  });

  // GET /v1/public/payment-links/:token — no auth needed
  app.get("/v1/public/payment-links/:token", {
    schema: {
      params: z.object({ token: z.string() }),
    },
  }, async (request) => {
    const prisma = getPrisma();
    const link = await prisma.paymentLink.findUnique({
      where: { token: request.params.token },
      include: { merchant: true },
    });

    if (!link) {
      throw new HimpaarError(404, "NOT_FOUND", "Payment link not found.");
    }

    return {
      token: link.token,
      merchant_name: link.merchant.name,
      reference: `PL-${link.id.slice(-8).toUpperCase()}`,
      description: link.description ?? "",
      amount: {
        amount_minor: bigIntToMinor(link.amount),
        currency: link.currency,
      },
      due_date: link.expiresAt.toISOString().slice(0, 10),
      status: link.status,
      sandbox: true,
    };
  });
};

export default paymentLinkRoutes;
