import { z } from "zod";

/**
 * Validates all environment variables at startup using Zod.
 * Fails fast with a clear error if any required variable is missing or invalid.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SANDBOX_MODE: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SIMULATOR_WEBHOOK_SECRET: z.string().min(1, "SIMULATOR_WEBHOOK_SECRET is required"),
  WEB_URL: z.string().url("WEB_URL must be a valid URL"),
  API_URL: z.string().url("API_URL must be a valid URL"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Nepal rules (simulated / unverified)
  UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO: z.coerce.bigint().positive(),
  UNVERIFIED_DEMO_FEE_BPS: z.coerce.bigint().nonnegative(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

/**
 * Parse and cache environment variables.
 * Throws a descriptive error on first call if validation fails.
 */
export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  _env = result.data;
  return _env;
}
