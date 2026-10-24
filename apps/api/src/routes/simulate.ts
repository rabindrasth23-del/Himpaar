/**
 * Simulate route — POST /v1/public/payment-links/:token/simulate
 *
 * The money path:
 * 1. Look up the payment link by token (must be "open")
 * 2. Inside ONE Prisma interactive transaction with lock_timeout = 5s:
 *    a. Create BankEvent (deduplication via eventId)
 *    b. SELECT ... FOR UPDATE on the Payment row
 *    c. Create Payment with the requested outcome
 *    d. If "success": create Settlement (pending), Document, ledger transfers 1-4
 *    e. Mark link as "paid"
 *    f. Record BankEventResult
 *    g. Create pending WebhookDelivery rows
 * 3. After commit: attempt first webhook delivery (best effort)
 * 4. Settlement moves pending → settled in a SEPARATE transaction (settleSettlement)
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
import { postPaymentTransfers, postSettlementTransfer } from "../lib/ledger.js";

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
 * Rounds DOWN (floor) so the merchant never gets more than the conversion warrants.
 */
function convertToNpr(netUsdCents: bigint, rateMicro: bigint): bigint {
  return (netUsdCents * rateMicro) / 1_000_000n;
}

const simulateRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /v1/public/payment-links/:token/simulate
  app.post("/v1/public/payment-links/:token/simulate", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute",
        keyGenerator: (req: { ip: string; params: unknown }) =>
          `${req.ip}:${(req.params as { token: string }).token}`,
      },
    },
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

    if (!env.SANDBOX_MODE) {
      throw new HimpaarError(403, "SANDBOX_DISABLED", "Simulate endpoint is disabled when SANDBOX_MODE is off.");
    }

    const { token } = request.params;
    const { event_id: eventId, ...input } = request.body;

    // 1. Look up payment link (outside the transaction for fast 404)
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

    // 2. Dedup check — fast return if already processed
    const payloadStr = JSON.stringify({ token, input, eventId });
    const payloadHash = sha256(payloadStr);

    const existingEvent = await prisma.bankEvent.findUnique({ where: { eventId } });
    if (existingEvent) {
      // Check if the payload hash matches (same key + different body → reject)
      if (existingEvent.payloadHash !== payloadHash) {
        throw new HimpaarError(409, "IDEMPOTENCY_MISMATCH", "Same event_id with different payload.");
      }
      const result = await prisma.bankEventResult.findUnique({ where: { eventId } });
      if (!result) {
        throw new HimpaarError(409, "EVENT_IN_PROGRESS", "This event is still being processed.");
      }
      return reply.status(200).send({
        payment_status: result.outcome,
        event_id: eventId,
      });
    }

    const now = new Date();
    let paymentStatus: string;

    if (input.outcome === "success") {
      // ── SUCCESS: one interactive transaction for everything ──
      const result = await prisma.$transaction(async (tx) => {
        // Set lock timeout to prevent deadlocks
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;

        // a. Store the bank event (dedup key)
        await tx.bankEvent.create({
          data: {
            eventId,
            payloadHash,
            payload: JSON.parse(payloadStr),
          },
        });

        // b. Create payment (succeeded)
        const payment = await tx.payment.create({
          data: {
            paymentLinkId: link.id,
            method: input.method,
            status: "succeeded",
            pendingAt: now,
            succeededAt: now,
          },
        });

        // Lock the payment row to prevent concurrent processing
        await tx.$queryRaw`
          SELECT id FROM payments WHERE id = ${payment.id} FOR UPDATE
        `;

        // c. Mark link as paid
        await tx.paymentLink.update({
          where: { id: link.id },
          data: { status: "paid", paidAt: now },
        });

        // d. Settlement: fee, FX, NPR
        const grossCents = link.amount;
        const feeBps = env.UNVERIFIED_DEMO_FEE_BPS;
        const feeCents = computeFee(grossCents, feeBps);
        const netUsdCents = grossCents - feeCents;
        const rateMicro = env.UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO;
        const netNprPaisa = convertToNpr(netUsdCents, rateMicro);

        // Settlement starts as "pending" — transfer 5 posts when it moves to "settled"
        const settlement = await tx.settlement.create({
          data: {
            paymentId: payment.id,
            grossUsdCents: grossCents,
            feeUsdCents: feeCents,
            rateMicro,
            netNprPaisa,
            currency: "USD",
            status: "pending",
          },
        });

        // e. Document (simulated settlement advice, TRD §11)
        const kyc = await tx.kycRecord.findFirst({
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

        const doc = await tx.document.create({
          data: {
            settlementId: settlement.id,
            json: { ...docJson },
            sha256: docSha,
          },
        });

        // f. Ledger transfers 1-4 (inside the same transaction)
        await postPaymentTransfers(tx, {
          paymentId: payment.id,
          merchantId: link.merchantId,
          grossUsdCents: grossCents,
          feeUsdCents: feeCents,
          netUsdCents,
          netNprPaisa,
          at: now,
        });

        // g. Record bank event result
        await tx.bankEventResult.create({
          data: {
            eventId,
            processedAt: now,
            outcome: "succeeded",
          },
        });

        // h. Enqueue webhook deliveries (pending rows)
        const endpoints = await tx.webhookEndpoint.findMany({
          where: { merchantId: link.merchantId },
        });

        for (const ep of endpoints) {
          await tx.webhookDelivery.create({
            data: {
              endpointId: ep.id,
              event: "payment.succeeded",
              payload: {
                payment_id: payment.id,
                settlement_id: settlement.id,
                amount: { amount_minor: grossCents.toString(), currency: "USD" },
                net_npr: { amount_minor: netNprPaisa.toString(), currency: "NPR" },
              },
              status: "pending",
              attempt: 0,
            },
          });
          await tx.webhookDelivery.create({
            data: {
              endpointId: ep.id,
              event: "document.created",
              payload: {
                document_id: doc.id,
                settlement_id: settlement.id,
              },
              status: "pending",
              attempt: 0,
            },
          });
        }

        return { payment, settlement, doc, grossCents, netNprPaisa };
      }, {
        timeout: 15_000,
      });

      // After commit: settle the settlement (transfer 5) in its own transaction
      await settleSettlement(prisma, result.settlement.id, link.merchantId, result.payment.id, result.netNprPaisa, now);

      // Fire settlement.settled webhooks (after settlement is done)
      const endpoints = await prisma.webhookEndpoint.findMany({
        where: { merchantId: link.merchantId },
      });
      for (const ep of endpoints) {
        await prisma.webhookDelivery.create({
          data: {
            endpointId: ep.id,
            event: "settlement.settled",
            payload: {
              settlement_id: result.settlement.id,
              payment_id: result.payment.id,
              net_npr: { amount_minor: result.netNprPaisa.toString(), currency: "NPR" },
            },
            status: "pending",
            attempt: 0,
          },
        });
      }

      paymentStatus = "succeeded";
    } else if (input.outcome === "decline") {
      // ── DECLINE: one transaction ──
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;

        await tx.bankEvent.create({
          data: { eventId, payloadHash, payload: JSON.parse(payloadStr) },
        });

        const payment = await tx.payment.create({
          data: {
            paymentLinkId: link.id,
            method: input.method,
            status: "failed",
            failedAt: now,
          },
        });

        await tx.bankEventResult.create({
          data: { eventId, processedAt: now, outcome: "failed" },
        });

        // Enqueue webhook deliveries
        const endpoints = await tx.webhookEndpoint.findMany({
          where: { merchantId: link.merchantId },
        });
        for (const ep of endpoints) {
          await tx.webhookDelivery.create({
            data: {
              endpointId: ep.id,
              event: "payment.failed",
              payload: { payment_id: payment.id, reason: "declined_simulated" },
              status: "pending",
              attempt: 0,
            },
          });
        }
      }, { timeout: 10_000 });

      paymentStatus = "failed";
    } else {
      // ── PENDING: one transaction ──
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;

        await tx.bankEvent.create({
          data: { eventId, payloadHash, payload: JSON.parse(payloadStr) },
        });

        await tx.payment.create({
          data: {
            paymentLinkId: link.id,
            method: input.method,
            status: "pending",
            pendingAt: now,
          },
        });

        await tx.bankEventResult.create({
          data: { eventId, processedAt: now, outcome: "pending" },
        });
      }, { timeout: 10_000 });

      paymentStatus = "pending";
    }

    return reply.status(200).send({
      payment_status: paymentStatus,
      event_id: eventId,
    });
  });
};

/**
 * Settle a settlement: move pending → settled and post transfer 5.
 * This runs in its OWN Prisma interactive transaction with the
 * Settlement row locked via SELECT ... FOR UPDATE.
 */
async function settleSettlement(
  prisma: ReturnType<typeof getPrisma>,
  settlementId: string,
  merchantId: string,
  paymentId: string,
  netNprPaisa: bigint,
  at: Date,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;

    // Lock the settlement row
    const rows: Array<{ status: string }> = await tx.$queryRaw`
      SELECT status FROM settlements WHERE id = ${settlementId} FOR UPDATE
    `;
    if (!rows[0] || rows[0].status !== "pending") {
      throw new HimpaarError(409, "INVALID_STATE", `Settlement is not pending (is "${rows[0]?.status}").`);
    }

    // Move to settled
    await tx.settlement.update({
      where: { id: settlementId },
      data: { status: "settled", settledAt: at },
    });

    // Transfer 5: merchant:npr → platform:npr:bank
    await postSettlementTransfer(tx, {
      paymentId,
      merchantId,
      netNprPaisa,
      at,
    });
  }, { timeout: 10_000 });
}

export { settleSettlement };
export default simulateRoutes;
