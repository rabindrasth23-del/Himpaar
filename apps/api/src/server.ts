import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";

/**
 * Start the Fastify server.
 * Separated from app.ts so tests can import buildApp() without listening.
 */
async function start() {
  const env = getEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
