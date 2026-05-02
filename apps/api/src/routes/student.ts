import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { startAttempt, submitAttempt, startTimer } from "../services/tokenService.js";

const startSchema = z.object({
  token: z.string().min(4),
  studentFullName: z.string().min(5)
});

const submitSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answer: z.string().max(5000)
    })
  )
});

export async function studentRoutes(app: FastifyInstance) {
  app.post("/api/v1/student/start", async (request, reply) => {
    try {
      const payload = startSchema.parse(request.body);
      const result = await startAttempt(app, payload);
      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/student/submit", async (request, reply) => {
    try {
      const payload = submitSchema.parse(request.body);
      
      // Student Authentication check
      try {
        const decoded = await request.jwtVerify() as { sub: string, role: string };
        if (decoded.role !== 'student' || decoded.sub !== payload.attemptId) {
          return reply.code(403).send({ error: "FORBIDDEN_ATTEMPT" });
        }
      } catch {
        return reply.code(401).send({ error: "UNAUTHORIZED_ATTEMPT" });
      }

      const result = await submitAttempt(payload);
      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/student/attempts/:id/start-timer", async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const result = await startTimer(params.id);
      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });
}

function mapError(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: "VALIDATION_ERROR", details: error.flatten() });
  }

  if (error instanceof Error) {
    const map: Record<string, number> = {
      STUDENT_NAME_INVALID: 400,
      TOKEN_INVALID: 404,
      TOKEN_UNAVAILABLE: 403,
      TOKEN_EXPIRED: 403,
      TOKEN_ALREADY_USED: 409,
      TOKEN_BOUND_TO_OTHER_STUDENT: 409,
      QUESTIONNAIRE_NOT_PUBLISHED: 403,
      NOT_SCHEDULED_FOR_TODAY: 403,
      EXAM_TIME_EXPIRED: 403,
      ATTEMPT_NOT_FOUND: 404,
      ATTEMPT_ALREADY_FINISHED: 409
    };

    const statusCode = map[error.message] ?? 500;
    return reply.code(statusCode).send({ error: error.message });
  }

  return reply.code(500).send({ error: "INTERNAL_ERROR" });
}
