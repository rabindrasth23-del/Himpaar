import type { FastifyPluginAsync } from "fastify";

/**
 * Health check route.
 * GET /health — returns { status: "ok" }.
 */
const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_request, _reply) => {
    return { status: "ok" };
  });
};

export default healthRoute;
