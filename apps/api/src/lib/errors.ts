/**
 * Unified API error response shape: { error: { code, message, details, request_id } }.
 * All routes throw HimpaarError; the error handler serializes it.
 */
import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

export class HimpaarError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: Record<string, unknown> | null;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details ?? null;
  }
}

export function sendError(reply: FastifyReply, err: HimpaarError) {
  return reply.status(err.statusCode).send({
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
      request_id: randomUUID(),
    },
  });
}

/** Fastify error handler that wraps unknown errors in the unified shape. */
export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof HimpaarError) {
    return sendError(reply, error);
  }

  // Fastify validation errors
  if ("validation" in error && "statusCode" in error) {
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: error.message,
        details: null,
        request_id: randomUUID(),
      },
    });
  }

  // Rate limit errors
  if ("statusCode" in error && (error as { statusCode: number }).statusCode === 429) {
    return reply.status(429).send({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        details: null,
        request_id: randomUUID(),
      },
    });
  }

  request.log.error(error, "Unhandled error");
  return reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: null,
      request_id: randomUUID(),
    },
  });
}
