import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { startWebhookWorker } from "./lib/webhook-worker.js";

/**
 * Start the Fastify server, webhook worker, and graceful shutdown handlers.
 */
async function start() {
  const env = getEnv();
  const app = await buildApp();

  // Start listening
  await app.listen({ port: env.PORT, host: "0.0.0.0" });

  // Start webhook worker (polling loop)
  const stopWorker = startWebhookWorker(app.log);

  // Graceful shutdown: stop claiming new webhook rows, finish in-flight,
  // then close server and connection pools.
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutdown signal received");
    await stopWorker();
    await app.close();
    await closeLedgerPool();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
