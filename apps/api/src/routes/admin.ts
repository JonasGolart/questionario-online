import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { QuestionType, UserRole } from "@prisma/client";
import {
  bootstrapAdmin,
  createQuestionnaire,
  generateTokens,
  importQuestionsFromJson,
  importQuestionsFromPdf,
  importQuestionsFromPdfBuffer,
  listQuestionnaires,
  getQuestionnaireReport,
  loginAdmin,
  publishQuestionnaire,
  updateQuestion,
  deleteQuestionnaire,
  updateQuestionnaire
} from "../services/adminService.js";
import { sendTokensByEmail } from "../services/emailService.js";

const bootstrapSchema = z.object({
  fullName: z.string().min(5),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const questionnaireSchema = z.object({
  name: z.string().min(3),
  category: z.string().min(2),
  discipline: z.string().min(2),
  description: z.string().max(4000).optional(),
  durationMinutes: z.number().int().positive().optional(),
  questionsPerAttempt: z.number().int().positive().nullable().optional(),
  scheduledDate: z.string().optional().nullable(),
  shuffleQuestions: z.boolean().optional()
});

const importJsonSchema = z.object({
  // Accept flexible question format - will be validated by normalizer
  questions: z.array(z.record(z.any())).min(1)
});

const importPdfSchema = z.object({
  pdfBase64: z.string().min(20)
});

const tokenGenerationSchema = z.object({
  quantity: z.number().int().min(1).max(200),
  expiresInDays: z.number().int().min(1).max(90)
});

const publishSchema = z.object({
  isPublished: z.boolean().default(true)
});

const updateQuestionBaseSchema = z.object({
  statement: z.string().min(3).optional(),
  imageUrl: z.string().min(1).max(2_000_000).optional(),
  topic: z.string().optional(),
  weight: z.number().positive().optional(),
  includeInPool: z.boolean().optional()
});

const updateQuestionSchema = z.discriminatedUnion("type", [
  updateQuestionBaseSchema.extend({
    type: z.literal(QuestionType.MULTIPLE_CHOICE),
    options: z.array(z.string().min(1)).min(2).optional(),
    correctAnswer: z.string().min(1).optional(),
    correctAnswers: z.array(z.string().min(1)).optional()
  }),
  updateQuestionBaseSchema.extend({
    type: z.literal(QuestionType.ESSAY),
    correctAnswers: z.array(z.string().min(1)).optional(),
    options: z.array(z.string().min(1)).optional(),
    correctAnswer: z.string().optional()
  })
]);

export async function adminRoutes(app: FastifyInstance) {
  app.post("/api/v1/admin/bootstrap", async (request, reply) => {
    try {
      const payload = bootstrapSchema.parse(request.body);
      const admin = await bootstrapAdmin(payload);
      return reply.code(201).send(admin);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/admin/login", async (request, reply) => {
    try {
      const payload = loginSchema.parse(request.body);
      const result = await loginAdmin(app, payload);
      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/admin/questionnaires", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const payload = questionnaireSchema.parse(request.body);
      const user = getAuthUser(request);
      const questionnaire = await createQuestionnaire({
        teacherId: user.id,
        ...payload
      });
      return reply.code(201).send(questionnaire);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.get("/api/v1/admin/questionnaires", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const user = getAuthUser(request);
      const questionnaires = await listQuestionnaires(user.id, user.role);
      return reply.send(questionnaires);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.get("/api/v1/admin/questionnaires/:id/report", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const report = await getQuestionnaireReport(params.id);
      return reply.send(report);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.delete("/api/v1/admin/questionnaires/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = getAuthUser(request);
      const result = await deleteQuestionnaire({
        questionnaireId: params.id,
        userId: user.id,
        role: user.role
      });
      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/admin/questionnaires/:id/import-json", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = importJsonSchema.parse(request.body);
      const user = getAuthUser(request);

      const questionnaire = await importQuestionsFromJson({
        questionnaireId: params.id,
        teacherId: user.id,
        role: user.role,
        questions: payload.questions
      });

      return reply.send(questionnaire);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/admin/questionnaires/:id/import-pdf", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = importPdfSchema.parse(request.body);
      const user = getAuthUser(request);

      const questionnaire = await importQuestionsFromPdf({
        questionnaireId: params.id,
        teacherId: user.id,
        role: user.role,
        pdfBase64: payload.pdfBase64
      });

      return reply.send(questionnaire);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/admin/questionnaires/:id/import-pdf-file", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = getAuthUser(request);
      const file = await request.file();

      if (!file) {
        throw new Error("PDF_INVALID");
      }

      if (file.mimetype !== "application/pdf") {
        throw new Error("PDF_INVALID");
      }

      const pdfBuffer = await file.toBuffer();

      const questionnaire = await importQuestionsFromPdfBuffer({
        questionnaireId: params.id,
        teacherId: user.id,
        role: user.role,
        pdfBuffer
      });

      return reply.send(questionnaire);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.post("/api/v1/admin/questionnaires/:id/tokens", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = tokenGenerationSchema.parse(request.body);
      const user = getAuthUser(request);

      const result = await generateTokens({
        questionnaireId: params.id,
        issuerId: user.id,
        role: user.role,
        quantity: payload.quantity,
        expiresInDays: payload.expiresInDays
      });

      return reply.code(201).send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.patch("/api/v1/admin/questionnaires/:id/publish", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = publishSchema.parse(request.body);
      const user = getAuthUser(request);

      const result = await publishQuestionnaire({
        questionnaireId: params.id,
        userId: user.id,
        role: user.role,
        isPublished: payload.isPublished
      });

      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.patch("/api/v1/admin/questions/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = updateQuestionSchema.parse(request.body);
      const user = getAuthUser(request);

      const result = await updateQuestion({
        questionId: params.id,
        userId: user.id,
        role: user.role,
        ...payload
      });

      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  app.patch("/api/v1/admin/questionnaires/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = questionnaireSchema.partial().parse(request.body);
      const user = getAuthUser(request);

      const result = await updateQuestionnaire({
        questionnaireId: params.id,
        userId: user.id,
        role: user.role,
        ...payload
      });

      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });

  // === E-mail Distribution ===
  app.post("/api/v1/admin/questionnaires/:id/send-tokens", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = z.object({
        emails: z.array(z.string().email()).min(1).max(200)
      }).parse(request.body);
      const user = getAuthUser(request);

      const result = await sendTokensByEmail({
        questionnaireId: params.id,
        userId: user.id,
        role: user.role,
        emails: payload.emails
      });

      return reply.send(result);
    } catch (error) {
      return mapError(reply, error);
    }
  });
}

function getAuthUser(request: FastifyRequest) {
  const user = request.user as { sub: string; role: UserRole; email: string };
  if (!user?.sub || !user.role) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    id: user.sub,
    role: user.role,
    email: user.email
  };
}

function mapError(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: unknown) {
  if (error instanceof z.ZodError) {
    console.error("Validation Error:", JSON.stringify(error.flatten(), null, 2));
    return reply.code(400).send({ error: "VALIDATION_ERROR", details: error.flatten() });
  }

  if (error instanceof Error) {
    console.error("API Error:", error.message);
    const map: Record<string, number> = {
      INVALID_CREDENTIALS: 401,
      BOOTSTRAP_ALREADY_DONE: 409,
      FORBIDDEN: 403,
      UNAUTHORIZED: 401,
      QUESTIONNAIRE_NOT_FOUND: 404,
      QUESTION_NOT_FOUND: 404,
      QUESTIONNAIRE_WITHOUT_QUESTIONS: 400,
      QUESTION_OPTIONS_INVALID: 400,
      QUESTION_CORRECT_ANSWER_INVALID: 400,
      PDF_INVALID: 400,
      PDF_PARSE_NO_QUESTIONS: 422,
      TOKEN_GENERATION_FAILED: 500,
      CANNOT_DELETE_WITH_USED_TOKENS: 400,
      RESEND_NOT_CONFIGURED: 503,
      NO_VALID_EMAILS: 400,
      NOT_ENOUGH_TOKENS: 400
    };

    const statusCode = map[error.message] ?? 500;
    return reply.code(statusCode).send({ error: error.message });
  }

  return reply.code(500).send({ error: "INTERNAL_ERROR" });
}
