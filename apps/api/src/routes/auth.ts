/**
 * Auth routes — POST /v1/auth/signup, /login, /logout, GET /v1/auth/me, POST /v1/kyc
 *
 * Passwords: argon2id via @node-rs/argon2.
 * Sessions: httpOnly SameSite=Lax cookie, SHA-256 token hash stored in Postgres.
 * KYC: sandbox-only, always approves immediately.
 */
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { hash, verify } from "@node-rs/argon2";
import {
  SignupInputSchema,
  LoginInputSchema,
  KycInputSchema,
} from "@himpaar/shared";
import { getPrisma } from "../config/prisma.js";
import { getEnv } from "../config/env.js";
import { generateSessionToken, sha256 } from "../lib/crypto.js";
import { HimpaarError } from "../lib/errors.js";
import { requireAuth, setSessionCookie, clearSessionCookie } from "../middleware/session.js";

const ABSOLUTE_HOURS = 7 * 24; // 7 days
const IDLE_HOURS = 24;

/** Create a new session in Postgres and set the cookie. */
async function createSession(merchantId: string, reply: import("fastify").FastifyReply) {
  const env = getEnv();
  const prisma = getPrisma();
  const token = generateSessionToken();
  const tokenHash = sha256(token);
  const now = new Date();

  await prisma.session.create({
    data: {
      merchantId,
      tokenHash,
      absoluteExpiry: new Date(now.getTime() + ABSOLUTE_HOURS * 60 * 60 * 1000),
      idleExpiry: new Date(now.getTime() + IDLE_HOURS * 60 * 60 * 1000),
    },
  });

  setSessionCookie(reply, token, env.NODE_ENV === "production");
  return token;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /v1/auth/signup
  app.post("/v1/auth/signup", {
    schema: {
      body: SignupInputSchema,
    },
  }, async (request, reply) => {
    const prisma = getPrisma();
    const { company_name, email, password } = request.body;

    // Check for existing merchant
    const existing = await prisma.merchant.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new HimpaarError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    }

    // Hash password with argon2id
    const passwordHash = await hash(password, {
      algorithm: 2, // argon2id
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });

    const merchant = await prisma.merchant.create({
      data: {
        name: company_name,
        email: email.toLowerCase(),
        password: passwordHash,
      },
    });

    // Create session
    await createSession(merchant.id, reply);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        action: "signup",
        ipAddress: request.ip,
      },
    });

    const session = {
      user: { id: merchant.id, email: merchant.email },
      merchant: {
        id: merchant.id,
        name: merchant.name,
        registration_number: null,
        pan_vat: null,
        kyc_status: "not_submitted" as const,
        created_at: merchant.createdAt.toISOString(),
      },
    };

    return reply.status(201).send(session);
  });

  // POST /v1/auth/login
  app.post("/v1/auth/login", {
    schema: {
      body: LoginInputSchema,
    },
  }, async (request, reply) => {
    const prisma = getPrisma();
    const { email, password } = request.body;

    const merchant = await prisma.merchant.findUnique({ where: { email: email.toLowerCase() } });
    if (!merchant) {
      throw new HimpaarError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const valid = await verify(merchant.password, password);
    if (!valid) {
      throw new HimpaarError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    await createSession(merchant.id, reply);

    // Audit
    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        action: "login",
        ipAddress: request.ip,
      },
    });

    // Check KYC status
    const kyc = await prisma.kycRecord.findFirst({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
    });

    const session = {
      user: { id: merchant.id, email: merchant.email },
      merchant: {
        id: merchant.id,
        name: merchant.name,
        registration_number: kyc?.data && typeof kyc.data === "object" && "registration_number" in (kyc.data as Record<string, unknown>)
          ? String((kyc.data as Record<string, unknown>).registration_number)
          : null,
        pan_vat: kyc?.data && typeof kyc.data === "object" && "pan_vat" in (kyc.data as Record<string, unknown>)
          ? String((kyc.data as Record<string, unknown>).pan_vat)
          : null,
        kyc_status: kyc ? "approved_sandbox" as const : "not_submitted" as const,
        created_at: merchant.createdAt.toISOString(),
      },
    };

    return reply.send(session);
  });

  // POST /v1/auth/logout
  app.post("/v1/auth/logout", {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const prisma = getPrisma();

    // Delete the current session
    if (request.sessionId) {
      await prisma.session.delete({ where: { id: request.sessionId } }).catch(() => {});
    }

    clearSessionCookie(reply);

    // Audit
    if (request.merchantId) {
      await prisma.auditLog.create({
        data: {
          merchantId: request.merchantId,
          action: "logout",
          ipAddress: request.ip,
        },
      });
    }

    return reply.status(204).send();
  });

  // Shared merchant serialization for /auth/me and /merchant
  async function loadMerchantDto(merchantId: string) {
    const prisma = getPrisma();
    const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
    const kyc = await prisma.kycRecord.findFirst({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
    });
    const data =
      kyc?.data && typeof kyc.data === "object" && !Array.isArray(kyc.data)
        ? (kyc.data as Record<string, unknown>)
        : null;
    return {
      email: merchant.email,
      dto: {
        id: merchant.id,
        name: merchant.name,
        registration_number: data && "registration_number" in data ? String(data.registration_number) : null,
        pan_vat: data && "pan_vat" in data ? String(data.pan_vat) : null,
        kyc_status: kyc ? ("approved_sandbox" as const) : ("not_submitted" as const),
        created_at: merchant.createdAt.toISOString(),
      },
    };
  }

  // GET /v1/auth/me
  app.get("/v1/auth/me", {
    preHandler: [requireAuth],
  }, async (request, _reply) => {
    const { email, dto } = await loadMerchantDto(request.merchantId!);
    return { user: { id: dto.id, email }, merchant: dto };
  });

  // GET /v1/merchant
  app.get("/v1/merchant", {
    preHandler: [requireAuth],
  }, async (request, _reply) => {
    return (await loadMerchantDto(request.merchantId!)).dto;
  });

  // POST /v1/kyc — sandbox: always approves immediately
  app.post("/v1/kyc", {
    schema: {
      body: KycInputSchema,
    },
    preHandler: [requireAuth],
  }, async (request, _reply) => {
    const prisma = getPrisma();
    const { company_name, registration_number, pan_vat } = request.body;

    // Update merchant name if changed
    await prisma.merchant.update({
      where: { id: request.merchantId! },
      data: { name: company_name },
    });

    // Create KYC record (sandbox: always approved)
    await prisma.kycRecord.create({
      data: {
        merchantId: request.merchantId!,
        status: "approved_sandbox",
        data: { company_name, registration_number, pan_vat },
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        merchantId: request.merchantId!,
        action: "kyc_submit",
        details: { status: "approved_sandbox" },
        ipAddress: request.ip,
      },
    });

    const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: request.merchantId! } });

    return {
      id: merchant.id,
      name: merchant.name,
      registration_number,
      pan_vat,
      kyc_status: "approved_sandbox" as const,
      created_at: merchant.createdAt.toISOString(),
    };
  });
};

export default authRoutes;
