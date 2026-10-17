/**
 * PrismaClient singleton for the API server.
 * Uses the pg adapter (Neon-compatible) and reads DATABASE_URL from env.
 */
import { PrismaClient } from "../../generated/prisma/client.js";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnv } from "./env.js";

let _prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;
  const env = getEnv();
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
  const adapter = new PrismaPg(pool);
  _prisma = new PrismaClient({ adapter });
  return _prisma;
}
