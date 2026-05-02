import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { adminRoutes } from "./routes/admin.js";
import { healthRoutes } from "./routes/health.js";
import { studentRoutes } from "./routes/student.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true
});

await app.register(jwt, {
  secret: env.JWT_SECRET
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute"
});

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "UNAUTHORIZED" });
  }
});

await app.register(healthRoutes);
await app.register(adminRoutes);
await app.register(studentRoutes);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR" });
});

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
