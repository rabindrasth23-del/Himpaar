/**
 * Dashboard data routes — payments, settlements, documents, API keys, webhooks.
 * All require authentication via requireAuth preHandler.
 */
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { CreateApiKeyInputSchema, CreateWebhookEndpointInputSchema } from "@himpaar/shared";
import { getPrisma } from "../config/prisma.js";
import { generateApiKey, sha256 } from "../lib/crypto.js";
import { HimpaarError } from "../lib/errors.js";
import { requireAuth } from "../middleware/session.js";
import { readDocumentJson, renderDocumentPdf, toDocumentDto } from "../lib/document.js";
import { randomBytes } from "node:crypto";

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /* ── Payments ──────────────────────────────────────────────── */
  app.get("/v1/payments", { preHandler: [requireAuth] }, async (request) => {
    const prisma = getPrisma();
    const payments = await prisma.payment.findMany({
      where: { paymentLink: { merchantId: request.merchantId! } },
      orderBy: { createdAt: "desc" },
      include: { paymentLink: { select: { amount: true, currency: true } } },
    });

    return {
      data: payments.map((p) => ({
        id: p.id,
        payment_link_id: p.paymentLinkId,
        reference: `PAY-${p.id.slice(-8).toUpperCase()}`,
        payer_name: "Simulated Payer",
        payer_country: "US",
        method: p.method ?? "card",
        amount: {
          amount_minor: p.paymentLink.amount.toString(),
          currency: p.paymentLink.currency,
        },
        status: p.status,
        created_at: p.createdAt.toISOString(),
        pending_at: p.pendingAt?.toISOString() ?? null,
        succeeded_at: p.succeededAt?.toISOString() ?? null,
        failed_at: p.failedAt?.toISOString() ?? null,
        expired_at: p.expiredAt?.toISOString() ?? null,
      })),
    };
  });

  app.get("/v1/payments/:id", {
    schema: { params: z.object({ id: z.string() }) },
    preHandler: [requireAuth],
  }, async (request) => {
    const prisma = getPrisma();
    const p = await prisma.payment.findFirst({
      where: { id: request.params.id, paymentLink: { merchantId: request.merchantId! } },
      include: { paymentLink: { select: { amount: true, currency: true } } },
    });
    if (!p) throw new HimpaarError(404, "NOT_FOUND", "Payment not found.");
    return {
      id: p.id,
      payment_link_id: p.paymentLinkId,
      reference: `PAY-${p.id.slice(-8).toUpperCase()}`,
      payer_name: "Simulated Payer",
      payer_country: "US",
      method: p.method ?? "card",
      amount: { amount_minor: p.paymentLink.amount.toString(), currency: p.paymentLink.currency },
      status: p.status,
      created_at: p.createdAt.toISOString(),
      pending_at: p.pendingAt?.toISOString() ?? null,
      succeeded_at: p.succeededAt?.toISOString() ?? null,
      failed_at: p.failedAt?.toISOString() ?? null,
      expired_at: p.expiredAt?.toISOString() ?? null,
    };
  });

  /* ── Settlements ───────────────────────────────────────────── */
  app.get("/v1/settlements", { preHandler: [requireAuth] }, async (request) => {
    const prisma = getPrisma();
    const settlements = await prisma.settlement.findMany({
      where: { payment: { paymentLink: { merchantId: request.merchantId! } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: settlements.map((s) => ({
        id: s.id,
        payment_id: s.paymentId,
        reference: `SET-${s.id.slice(-8).toUpperCase()}`,
        gross: { amount_minor: s.grossUsdCents.toString(), currency: "USD" },
        fee: { amount_minor: s.feeUsdCents.toString(), currency: "USD" },
        fee_bps: Number(s.feeUsdCents * 10000n / (s.grossUsdCents || 1n)),
        net_usd: { amount_minor: (s.grossUsdCents - s.feeUsdCents).toString(), currency: "USD" },
        rate_micro: s.rateMicro.toString(),
        rate_label: "simulated" as const,
        net_npr: { amount_minor: s.netNprPaisa.toString(), currency: "NPR" },
        status: s.status,
        created_at: s.createdAt.toISOString(),
        settled_at: s.settledAt?.toISOString() ?? null,
        failed_at: s.failedAt?.toISOString() ?? null,
        reversed_at: s.reversedAt?.toISOString() ?? null,
        bs_date: null,
      })),
    };
  });

  app.get("/v1/settlements/:id", {
    schema: { params: z.object({ id: z.string() }) },
    preHandler: [requireAuth],
  }, async (request) => {
    const prisma = getPrisma();
    const s = await prisma.settlement.findFirst({
      where: { id: request.params.id, payment: { paymentLink: { merchantId: request.merchantId! } } },
    });
    if (!s) throw new HimpaarError(404, "NOT_FOUND", "Settlement not found.");
    return {
      id: s.id,
      payment_id: s.paymentId,
      reference: `SET-${s.id.slice(-8).toUpperCase()}`,
      gross: { amount_minor: s.grossUsdCents.toString(), currency: "USD" },
      fee: { amount_minor: s.feeUsdCents.toString(), currency: "USD" },
      fee_bps: Number(s.feeUsdCents * 10000n / (s.grossUsdCents || 1n)),
      net_usd: { amount_minor: (s.grossUsdCents - s.feeUsdCents).toString(), currency: "USD" },
      rate_micro: s.rateMicro.toString(),
      rate_label: "simulated" as const,
      net_npr: { amount_minor: s.netNprPaisa.toString(), currency: "NPR" },
      status: s.status,
      created_at: s.createdAt.toISOString(),
      settled_at: s.settledAt?.toISOString() ?? null,
      failed_at: s.failedAt?.toISOString() ?? null,
      reversed_at: s.reversedAt?.toISOString() ?? null,
      bs_date: null,
    };
  });

  /* ── Documents ─────────────────────────────────────────────── */
  app.get("/v1/documents", { preHandler: [requireAuth] }, async (request) => {
    const prisma = getPrisma();
    const docs = await prisma.document.findMany({
      where: { settlement: { payment: { paymentLink: { merchantId: request.merchantId! } } } },
      orderBy: { createdAt: "desc" },
    });
    return { data: docs.map(toDocumentDto) };
  });

  app.get("/v1/documents/:id", {
    schema: { params: z.object({ id: z.string() }) },
    preHandler: [requireAuth],
  }, async (request) => {
    const prisma = getPrisma();
    const d = await prisma.document.findFirst({
      where: { id: request.params.id, settlement: { payment: { paymentLink: { merchantId: request.merchantId! } } } },
    });
    if (!d) throw new HimpaarError(404, "NOT_FOUND", "Document not found.");
    return toDocumentDto(d);
  });

  app.get("/v1/documents/:id/pdf", {
    schema: { params: z.object({ id: z.string() }) },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const prisma = getPrisma();
    const d = await prisma.document.findFirst({
      where: { id: request.params.id, settlement: { payment: { paymentLink: { merchantId: request.merchantId! } } } },
    });
    if (!d) throw new HimpaarError(404, "NOT_FOUND", "Document not found.");
    const pdf = await renderDocumentPdf(d.id, d.sha256, readDocumentJson(d.json, d.createdAt));
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="himpaar-settlement-advice-${d.id}.pdf"`)
      .header("Cache-Control", "private, no-store")
      .send(pdf);
  });

  /* ── API Keys ──────────────────────────────────────────────── */
  app.get("/v1/api-keys", { preHandler: [requireAuth] }, async (request) => {
    const prisma = getPrisma();
    const keys = await prisma.apiKey.findMany({
      where: { merchantId: request.merchantId! },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: keys.map((k) => ({
        id: k.id,
        name: k.name || k.prefix,
        prefix: k.prefix,
        created_at: k.createdAt.toISOString(),
        last_used_at: null,
        revoked_at: k.revokedAt?.toISOString() ?? null,
      })),
    };
  });

  app.post("/v1/api-keys", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 hour",
        keyGenerator: (req: import("fastify").FastifyRequest) => `apikey-create:${req.merchantId}`,
      },
    },
    schema: { body: CreateApiKeyInputSchema },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const prisma = getPrisma();
    const { fullKey, prefix } = generateApiKey();
    const keyHash = sha256(fullKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        merchantId: request.merchantId!,
        name: request.body.name,
        prefix,
        sha256Hash: keyHash,
      },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: request.merchantId!,
        action: "api_key_create",
        details: { keyId: apiKey.id, prefix },
        ipAddress: request.ip,
      },
    });

    return reply.status(201).send({
      api_key: {
        id: apiKey.id,
        name: apiKey.name,
        prefix,
        created_at: apiKey.createdAt.toISOString(),
        last_used_at: null,
        revoked_at: null,
      },
      secret: fullKey,
    });
  });

  app.delete("/v1/api-keys/:id", {
    schema: { params: z.object({ id: z.string() }) },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const prisma = getPrisma();
    const key = await prisma.apiKey.findFirst({
      where: { id: request.params.id, merchantId: request.merchantId! },
    });
    if (!key) throw new HimpaarError(404, "NOT_FOUND", "API key not found.");

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: request.merchantId!,
        action: "api_key_revoke",
        details: { keyId: key.id },
        ipAddress: request.ip,
      },
    });

    return reply.status(204).send();
  });

  /* ── Webhook Endpoints ─────────────────────────────────────── */
  app.get("/v1/webhook-endpoints", { preHandler: [requireAuth] }, async (request) => {
    const prisma = getPrisma();
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { merchantId: request.merchantId! },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: endpoints.map((ep) => ({
        id: ep.id,
        url: ep.url,
        created_at: ep.createdAt.toISOString(),
      })),
    };
  });

  app.post("/v1/webhook-endpoints", {
    schema: { body: CreateWebhookEndpointInputSchema },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const prisma = getPrisma();
    const signingSecret = `whsec_${randomBytes(24).toString("base64url")}`;

    const ep = await prisma.webhookEndpoint.create({
      data: {
        merchantId: request.merchantId!,
        url: request.body.url,
        secret: signingSecret,
      },
    });

    return reply.status(201).send({
      endpoint: {
        id: ep.id,
        url: ep.url,
        created_at: ep.createdAt.toISOString(),
      },
      secret: signingSecret,
    });
  });

  app.delete("/v1/webhook-endpoints/:id", {
    schema: { params: z.object({ id: z.string() }) },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const prisma = getPrisma();
    const ep = await prisma.webhookEndpoint.findFirst({
      where: { id: request.params.id, merchantId: request.merchantId! },
    });
    if (!ep) throw new HimpaarError(404, "NOT_FOUND", "Webhook endpoint not found.");

    await prisma.webhookEndpoint.delete({ where: { id: ep.id } });
    return reply.status(204).send();
  });

  /* ── Webhook Deliveries ────────────────────────────────────── */
  app.get("/v1/webhook-deliveries", { preHandler: [requireAuth] }, async (request) => {
    const prisma = getPrisma();
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { endpoint: { merchantId: request.merchantId! } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      data: deliveries.map((d) => ({
        id: d.id,
        endpoint_id: d.endpointId,
        event_id: d.id, // use delivery ID as event ID for simplicity
        event_type: d.event,
        attempt: d.attempt,
        status: d.status,
        response_code: d.status === "delivered" ? 200 : null,
        created_at: d.createdAt.toISOString(),
        next_attempt_at: d.nextAttemptAt?.toISOString() ?? null,
      })),
    };
  });

  app.post("/v1/webhook-deliveries/:id/redeliver", {
    schema: { params: z.object({ id: z.string() }) },
    preHandler: [requireAuth],
  }, async (request) => {
    const prisma = getPrisma();
    const d = await prisma.webhookDelivery.findFirst({
      where: { id: request.params.id, endpoint: { merchantId: request.merchantId! } },
    });
    if (!d) throw new HimpaarError(404, "NOT_FOUND", "Delivery not found.");

    // Simulated redeliver: TRD §8 caps a delivery at 5 attempts
    if (d.attempt >= 5) {
      throw new HimpaarError(409, "MAX_ATTEMPTS_REACHED", "This delivery has already used all 5 attempts.");
    }
    const updated = await prisma.webhookDelivery.update({
      where: { id: d.id },
      data: { attempt: d.attempt + 1, status: "delivered" },
    });

    return {
      id: updated.id,
      endpoint_id: updated.endpointId,
      event_id: updated.id,
      event_type: updated.event,
      attempt: updated.attempt,
      status: updated.status,
      response_code: 200,
      created_at: updated.createdAt.toISOString(),
      next_attempt_at: null,
    };
  });
};

export default dashboardRoutes;
