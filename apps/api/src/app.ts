import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";
import { getEnv } from "./config/env.js";
import healthRoute from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import paymentLinkRoutes from "./routes/payment-links.js";
import simulateRoutes from "./routes/simulate.js";
import dashboardRoutes from "./routes/dashboard.js";
import { csrfCheck } from "./middleware/csrf.js";
import { errorHandler } from "./lib/errors.js";

/**
 * Build and configure the Fastify application instance.
 * Does not call listen() — that is done in server.ts.
 * This separation allows Vitest to use fastify.inject() without binding a port.
 */
export async function buildApp() {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Redact secrets from pino log output.
      // Covers: authorization header, cookies (req + res), passwords in body, API keys.
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['set-cookie']",
        "req.headers['x-api-key']",
        "res.headers['set-cookie']",
        "req.body.password",
        "req.body.currentPassword",
        "req.body.newPassword",
        "req.body.apiKey",
        "req.body.secret",
      ],
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Set Zod as the schema validator and serializer
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Unified error handler
  app.setErrorHandler(errorHandler);

  // Register plugins
  await app.register(cookie, {
    secret: env.SESSION_SECRET,
  });

  await app.register(cors, {
    origin: env.WEB_URL,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // CSRF protection on all state-changing requests
  app.addHook("onRequest", csrfCheck);

  // Register routes
  await app.register(healthRoute);
  await app.register(authRoutes);
  await app.register(paymentLinkRoutes);
  await app.register(simulateRoutes);
  await app.register(dashboardRoutes);

  return app;
}

