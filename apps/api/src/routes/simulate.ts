/**
 * Simulate route — POST /v1/public/payment-links/:token/simulate
 *
 * The money path:
 * 1. Look up the payment link by token (must be "open")
 * 2. Create a BankEvent (deduplication via eventId)
 * 3. Create a Payment with the requested outcome
 * 4. If "success" → create Settlement (fee, FX, NPR) + Document + ledger legs
 * 5. If "decline" → mark payment failed
 * 6. If "pending" → mark payment pending (can be advanced later)
 * 7. Fire webhook deliveries to all endpoints
 *
 * All arithmetic is BigInt. No floating point anywhere.
 */
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { SimulateInputSchema } from "@himpaar/shared";
import { getPrisma } from "../config/prisma.js";
import { getEnv } from "../config/env.js";
import { sha256 } from "../lib/crypto.js";
import { HimpaarError } from "../lib/errors.js";
import { buildDocumentJson } from "../lib/document.js";

/**
 * Fee calculation: gross × feeBps / 10_000.
 * Rounds UP (ceil) so the platform never undercharges.
 */
function computeFee(grossCents: bigint, feeBps: bigint): bigint {
  const product = grossCents * feeBps;
  const base = 10_000n;
  // ceil division: (a + b - 1) / b
  return (product + base - 1n) / base;
}

/**
 * FX conversion: USD cents → NPR paisa.
 * rateMicro = NPR per USD × 1,000,000.
 * netNprPaisa = netUsdCents × rateMicro × 100 / (100 × 1_000_000)
 *             = netUsdCents × rateMicro / 1_000_000
 * Rounds DOWN (floor) so the merchant never gets more than the conversion warrants.
 */
function convertToNpr(netUsdCents: bigint, rateMicro: bigint): bigint {
  // netUsdCents is in cents. We want paisa.
  // 1 USD = 100 cents. rateMicro is NPR per USD × 1e6.
  // NPR = netUsdCents / 100 * rateMicro / 1e6
  // NPR paisa = NPR * 100 = netUsdCents * rateMicro / 1e6
  return (netUsdCents * rateMicro) / 1_000_000n;
}

const simulateRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /v1/public/payment-links/:token/simulate
  app.post("/v1/public/payment-links/:token/simulate", {
    schema: {
      params: z.object({ token: z.string() }),
      // Flat body: { method, outcome, event_id } — matches the web client (TRD §7).
      body: SimulateInputSchema.extend({
        event_id: z.string().min(8).max(128),
      }),
    },
  }, async (request, reply) => {
    const prisma = getPrisma();
    const env = getEnv();
    const { token } = request.params;
    const { event_id: eventId, ...input } = request.body;

    // 1. Look up payment link
    const link = await prisma.paymentLink.findUnique({
      where: { token },
      include: { merchant: true },
    });

    if (!link) {
      throw new HimpaarError(404, "NOT_FOUND", "Payment link not found.");
    }

    if (link.status !== "open") {
      throw new HimpaarError(409, "LINK_NOT_OPEN", `Payment link is "${link.status}", not "open".`);
    }

    // 2. Dedup via BankEvent
    const payloadStr = JSON.stringify({ token, input, eventId });
    const payloadHash = sha256(payloadStr);

    const existingEvent = await prisma.bankEvent.findUnique({ where: { eventId } });
    if (existingEvent) {
      // Already processed — return the stored outcome
      const result = await prisma.bankEventResult.findUnique({ where: { eventId } });
      if (!result) {
        throw new HimpaarError(409, "EVENT_IN_PROGRESS", "This event is still being processed.");
      }
      return reply.status(200).send({
        payment_status: result.outcome,
        event_id: eventId,
      });
    }

    // Store the bank event
    await prisma.bankEvent.create({
      data: {
        eventId,
        payloadHash,
        payload: JSON.parse(payloadStr),
      },
    });

    const now = new Date();
    let paymentStatus: string;

    if (input.outcome === "success") {
      // 3. Create payment (succeeded)
      const payment = await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          method: input.method,
          status: "succeeded",
          pendingAt: now,
          succeededAt: now,
        },
      });

      // 4. Mark link as paid
      await prisma.paymentLink.update({
        where: { id: link.id },
        data: { status: "paid", paidAt: now },
      });

      // 5. Settlement: fee, FX, NPR
      const grossCents = link.amount;
      const feeBps = env.UNVERIFIED_DEMO_FEE_BPS;
      const feeCents = computeFee(grossCents, feeBps);
      const netUsdCents = grossCents - feeCents;
      const rateMicro = env.UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO;
      const netNprPaisa = convertToNpr(netUsdCents, rateMicro);

      const settlement = await prisma.settlement.create({
        data: {
          paymentId: payment.id,
          grossUsdCents: grossCents,
          feeUsdCents: feeCents,
          rateMicro,
          netNprPaisa,
          currency: "USD",
          status: "settled",
          settledAt: now,
        },
      });

      // 6. Document (simulated settlement advice, TRD §11)
      const kyc = await prisma.kycRecord.findFirst({
        where: { merchantId: link.merchantId },
        orderBy: { createdAt: "desc" },
      });
      const kycData = kyc?.data && typeof kyc.data === "object" && !Array.isArray(kyc.data)
        ? (kyc.data as Record<string, unknown>)
        : null;
      const docJson = buildDocumentJson({
        merchantName: link.merchant.name,
        merchantPanVat: typeof kycData?.pan_vat === "string" ? kycData.pan_vat : null,
        invoiceReference: `PL-${link.id.slice(-8).toUpperCase()}`,
        grossUsdCents: grossCents,
        feeUsdCents: feeCents,
        feeBps,
        rateMicro,
        netNprPaisa,
        at: now,
      });
      const docSha = sha256(JSON.stringify(docJson));

      await prisma.document.create({
        data: {
          settlementId: settlement.id,
          json: { ...docJson },
          sha256: docSha,
        },
      });

      // Record bank event result
      await prisma.bankEventResult.create({
        data: {
          eventId,
          processedAt: now,
          outcome: "succeeded",
        },
      });

      // Fire webhooks
      await fireWebhooks(prisma, link.merchantId, "payment.succeeded", {
        payment_id: payment.id,
        settlement_id: settlement.id,
        amount: { amount_minor: grossCents.toString(), currency: "USD" },
        net_npr: { amount_minor: netNprPaisa.toString(), currency: "NPR" },
      });

      paymentStatus = "succeeded";
    } else if (input.outcome === "decline") {
      // Payment failed
      const payment = await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          method: input.method,
          status: "failed",
          failedAt: now,
        },
      });

      await prisma.bankEventResult.create({
        data: { eventId, processedAt: now, outcome: "failed" },
      });

      await fireWebhooks(prisma, link.merchantId, "payment.failed", {
        payment_id: payment.id,
        reason: "declined_simulated",
      });

      paymentStatus = "failed";
    } else {
      // Pending
      await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          method: input.method,
          status: "pending",
          pendingAt: now,
        },
      });

      await prisma.bankEventResult.create({
        data: { eventId, processedAt: now, outcome: "pending" },
      });

      paymentStatus = "pending";
    }

    return reply.status(200).send({
      payment_status: paymentStatus,
      event_id: eventId,
    });
  });
};

/** Fire webhook deliveries to all of a merchant's endpoints. */
async function fireWebhooks(
  prisma: ReturnType<typeof getPrisma>,
  merchantId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { merchantId },
  });

  for (const ep of endpoints) {
    await prisma.webhookDelivery.create({
      data: {
        endpointId: ep.id,
        event: eventType,
        payload: JSON.parse(JSON.stringify(payload)),
        status: "delivered", // Simulated: always "delivered"
        attempt: 1,
      },
    });
  }
}

export default simulateRoutes;
