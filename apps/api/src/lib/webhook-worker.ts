/**
 * Webhook delivery worker (TRD §8).
 *
 * Uses the Standard Webhooks specification via the `standardwebhooks` library
 * for signing. Runs as a polling loop inside the API process.
 *
 * Retry schedule: 5 total attempts — immediate, +1m, +5m, +30m, +2h.
 * 10-second timeout per attempt. Status becomes "dead" after 5 failures.
 *
 * Claims rows with FOR UPDATE SKIP LOCKED for concurrency safety.
 * Graceful shutdown: stops claiming new rows on SIGTERM/SIGINT, finishes
 * in-flight deliveries, then exits.
 */
import { Webhook } from "standardwebhooks";
import { getPrisma } from "../config/prisma.js";
import type { FastifyBaseLogger } from "fastify";

/** Retry delays in milliseconds after attempt N (0-indexed from attempt 2). */
const RETRY_DELAYS_MS = [
  1 * 60_000,   // after 1st failure: +1 min
  5 * 60_000,   // after 2nd failure: +5 min
  30 * 60_000,  // after 3rd failure: +30 min
  2 * 60 * 60_000, // after 4th failure: +2 hours
];

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 5_000;

let shutdownRequested = false;

/**
 * Attempt a single webhook delivery.
 * Returns the HTTP status code, or null on network/timeout error.
 */
async function attemptDelivery(
  url: string,
  secret: string,
  _eventType: string,
  payload: unknown,
  deliveryId: string,
): Promise<number | null> {
  const wh = new Webhook(secret);
  const body = JSON.stringify(payload);
  const msgId = deliveryId;
  const timestamp = new Date();

  // Sign the payload
  const signature = wh.sign(msgId, timestamp, body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "webhook-id": msgId,
        "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
        "webhook-signature": signature,
      },
      body,
      signal: controller.signal,
    });
    return res.status;
  } catch {
    return null; // network error or timeout
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Process one batch of pending deliveries.
 * Uses raw SQL for FOR UPDATE SKIP LOCKED (not available via Prisma).
 */
async function processBatch(log: FastifyBaseLogger): Promise<number> {
  const prisma = getPrisma();

  // Find deliveries that are pending or failed and due for retry
  const deliveries = await prisma.$queryRawUnsafe<Array<{
    id: string;
    endpointId: string;
    event: string;
    payload: unknown;
    status: string;
    attempt: number;
    nextAttemptAt: Date | null;
  }>>(
    `SELECT d.id, d.endpoint_id AS "endpointId", d.event, d.payload,
            d.status, d.attempt, d.next_attempt_at AS "nextAttemptAt"
     FROM webhook_deliveries d
     WHERE (d.status = 'pending' OR (d.status = 'failed' AND d.next_attempt_at <= NOW()))
     ORDER BY d.created_at ASC
     LIMIT 10
     FOR UPDATE SKIP LOCKED`,
  );

  if (deliveries.length === 0) return 0;

  for (const d of deliveries) {
    if (shutdownRequested) break;

    // Look up the endpoint to get url + secret
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: d.endpointId },
    });
    if (!endpoint) {
      // Endpoint deleted — mark dead
      await prisma.webhookDelivery.update({
        where: { id: d.id },
        data: { status: "dead", attempt: d.attempt },
      });
      continue;
    }

    const responseCode = await attemptDelivery(
      endpoint.url,
      endpoint.secret,
      d.event,
      d.payload,
      d.id,
    );

    const success = responseCode !== null && responseCode >= 200 && responseCode < 300;
    const newAttempt = d.attempt + 1;

    if (success) {
      await prisma.webhookDelivery.update({
        where: { id: d.id },
        data: {
          status: "delivered",
          attempt: newAttempt,
          responseCode,
          nextAttemptAt: null,
        },
      });
      log.info({ deliveryId: d.id, attempt: newAttempt }, "webhook delivered");
    } else if (newAttempt >= MAX_ATTEMPTS) {
      // All 5 attempts exhausted → dead
      await prisma.webhookDelivery.update({
        where: { id: d.id },
        data: {
          status: "dead",
          attempt: newAttempt,
          responseCode,
          nextAttemptAt: null,
        },
      });
      log.warn({ deliveryId: d.id, attempt: newAttempt }, "webhook dead after max attempts");
    } else {
      // Schedule retry
      const delayMs = RETRY_DELAYS_MS[newAttempt - 2] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 7_200_000;
      const nextAt = new Date(Date.now() + delayMs);
      await prisma.webhookDelivery.update({
        where: { id: d.id },
        data: {
          status: "failed",
          attempt: newAttempt,
          responseCode,
          nextAttemptAt: nextAt,
        },
      });
      log.info({ deliveryId: d.id, attempt: newAttempt, nextAt: nextAt.toISOString() }, "webhook failed, scheduled retry");
    }
  }

  return deliveries.length;
}

/**
 * Start the polling loop. Call this once after the Fastify server starts.
 * Returns a cleanup function for graceful shutdown.
 */
export function startWebhookWorker(log: FastifyBaseLogger): () => Promise<void> {
  shutdownRequested = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  async function poll() {
    if (shutdownRequested) return;
    try {
      const processed = await processBatch(log);
      // If we processed items, poll again immediately; otherwise wait
      if (!shutdownRequested) {
        timer = setTimeout(poll, processed > 0 ? 100 : POLL_INTERVAL_MS);
      }
    } catch (err) {
      log.error({ err }, "webhook worker error");
      if (!shutdownRequested) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
  }

  // Start first poll
  inFlight = poll().catch(() => {});
  log.info("webhook worker started");

  return async () => {
    shutdownRequested = true;
    if (timer) clearTimeout(timer);
    // Wait for the in-flight batch to finish
    if (inFlight) await inFlight;
    log.info("webhook worker stopped");
  };
}
