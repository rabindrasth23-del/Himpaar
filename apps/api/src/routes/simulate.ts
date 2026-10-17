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
import {
  UNVERIFIED_DOCUMENT_TITLE,
  UNVERIFIED_DOCUMENT_FOOTER,
} from "../compliance/nepal.config.js";

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
      body: z.object({
        input: SimulateInputSchema,
        eventId: z.string().uuid(),
      }),
    },
  }, async (request, reply) => {
    const prisma = getPrisma();
    const env = getEnv();
    const { token } = request.params;
    const { input, eventId } = request.body;

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
      // Already processed — return the cached result
      const result = await prisma.bankEventResult.findUnique({ where: { eventId } });
      return reply.status(200).send({
        payment_status: result?.outcome ?? "duplicate",
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

      // 6. Document (simulated settlement advice)
      const docJson = {
        title: UNVERIFIED_DOCUMENT_TITLE,
        footer: UNVERIFIED_DOCUMENT_FOOTER,
        merchant_name: link.merchant.name,
        merchant_pan_vat: null,
        payer_name: "Simulated Payer",
        payer_country: "US",
        reference: `PL-${link.id.slice(-8).toUpperCase()}`,
        gross_usd: grossCents.toString(),
        fee_usd: feeCents.toString(),
        fee_bps: Number(feeBps),
        net_usd: netUsdCents.toString(),
        rate_micro: rateMicro.toString(),
        rate_label: "simulated",
        net_npr: netNprPaisa.toString(),
        settled_at: now.toISOString(),
      };
      const docSha = sha256(JSON.stringify(docJson));

      await prisma.document.create({
        data: {
          settlementId: settlement.id,
          json: docJson,
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
