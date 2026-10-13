import type { FastifyPluginAsync } from "fastify";

/**
 * Health check route.
 * GET /health — returns { status: "ok" }.
 */
const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (request, _reply) => {
    request.log.info(
      { receivedUrl: request.url, rawUrl: request.raw.url },
      "Health check route invoked"
    );
    return { status: "ok" };
  });

  fastify.get("/v1/health", async (request, _reply) => {
    request.log.info(
      { receivedUrl: request.url, rawUrl: request.raw.url },
      "V1 Health check route invoked"
    );
    return { status: "ok" };
  });
};

export default healthRoute;
