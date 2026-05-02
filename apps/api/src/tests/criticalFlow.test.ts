import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenStatus, UserRole } from "@prisma/client";

type DbState = {
  questionnaires: Array<{
    id: string;
    teacherId: string;
    name: string;
    category: string;
    discipline: string;
    description?: string;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  questions: Array<{
    id: string;
    questionnaireId: string;
    statement: string;
    options: string[];
    correctAnswer: string;
    topic: string | null;
    weight: number;
    position: number;
  }>;
  tokens: Array<{
    id: string;
    code: string;
    questionnaireId: string;
    issuerId: string;
    status: TokenStatus;
    boundStudentName: string | null;
    expiresAt: Date;
    maxUses: number;
    currentUses: number;
    usedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  attempts: Array<{
    id: string;
    questionnaireId: string;
    tokenId: string;
    studentFullName: string;
    startedAt: Date;
    finishedAt: Date | null;
    score: number | null;
    percentage: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  answers: Array<{
    attemptId: string;
    questionId: string;
    answerValue: string;
    isCorrect: boolean;
    points: number;
  }>;
  reports: Array<{
    attemptId: string;
    summary: string;
    stats: { score: number; totalPoints: number; percentage: number };
    weakTopics: Array<{ topic: string; percentage: number }>;
  }>;
};

type QuestionnaireCreateData = {
  teacherId: string;
  name: string;
  category: string;
  discipline: string;
  description?: string;
};

type QuestionCreateManyData = {
  questionnaireId: string;
  statement: string;
  options: string[];
  correctAnswer: string;
  topic: string | null;
  weight: number;
  position: number;
};

type AccessTokenCreateData = {
  code: string;
  questionnaireId: string;
  issuerId: string;
  expiresAt: Date;
  maxUses: number;
  currentUses: number;
};

type AttemptCreateData = {
  questionnaireId: string;
  tokenId: string;
  studentFullName: string;
};

const prismaMock: Record<string, unknown> = {};

vi.mock("../config/db.js", () => ({ prisma: prismaMock }));

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildMockPrisma(state: DbState) {
  const api = {
    questionnaire: {
      create: vi.fn(async ({ data }: { data: QuestionnaireCreateData }) => {
        const row = {
          ...data,
          id: uid("qnr"),
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.questionnaires.push(row);
        return row;
      }),
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: { questions?: true } }) => {
        const row = state.questionnaires.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        if (include?.questions) {
          return {
            ...row,
            questions: state.questions.filter((question) => question.questionnaireId === row.id)
          };
        }
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<DbState["questionnaires"][number]> }) => {
        const row = state.questionnaires.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      }),
      findMany: vi.fn(async () => state.questionnaires)
    },
    question: {
      deleteMany: vi.fn(async ({ where }: { where: { questionnaireId: string } }) => {
        state.questions = state.questions.filter((item) => item.questionnaireId !== where.questionnaireId);
      }),
      createMany: vi.fn(async ({ data }: { data: Array<QuestionCreateManyData> }) => {
        for (const item of data) {
          state.questions.push({ ...item, id: uid("qst") });
        }
      }),
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: { questionnaire?: true } }) => {
        const row = state.questions.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        if (include?.questionnaire) {
          const questionnaire = state.questionnaires.find((item) => item.id === row.questionnaireId);
          return {
            ...row,
            questionnaire
          };
        }
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<DbState["questions"][number]> }) => {
        const row = state.questions.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        Object.assign(row, data);
        return row;
      })
    },
    accessToken: {
      findFirst: vi.fn(async ({ where, include }: { where: { code?: { equals?: string; mode?: string } }; include?: { questionnaire?: { include?: { questions?: { orderBy?: { position: "asc" } } } }; attempt?: true } }) => {
        const searchedCode = where?.code?.equals;
        const row = state.tokens.find((item) => searchedCode ? item.code.toUpperCase() === searchedCode.toUpperCase() : false);
        if (!row) {
          return null;
        }
        if (!include) {
          return row;
        }
        const questionnaire = state.questionnaires.find((item) => item.id === row.questionnaireId);
        const questions = state.questions
          .filter((item) => item.questionnaireId === row.questionnaireId)
          .sort((a, b) => a.position - b.position);
        const attempt = state.attempts.find((item) => item.tokenId === row.id) ?? null;
        return {
          ...row,
          questionnaire: questionnaire ? { ...questionnaire, questions } : null,
          attempt
        };
      }),
      findUnique: vi.fn(async ({ where, include }: { where: { code?: string; id?: string }; include?: { questionnaire?: { include?: { questions?: { orderBy?: { position: "asc" } } } }; attempt?: true } }) => {
        const row = state.tokens.find((item) => (where.code ? item.code === where.code : item.id === where.id));
        if (!row) {
          return null;
        }
        if (!include) {
          return row;
        }
        const questionnaire = state.questionnaires.find((item) => item.id === row.questionnaireId);
        const questions = state.questions
          .filter((item) => item.questionnaireId === row.questionnaireId)
          .sort((a, b) => a.position - b.position);
        const attempt = state.attempts.find((item) => item.tokenId === row.id) ?? null;
        return {
          ...row,
          questionnaire: questionnaire ? { ...questionnaire, questions } : null,
          attempt
        };
      }),
      create: vi.fn(async ({ data }: { data: AccessTokenCreateData }) => {
        const row = {
          ...data,
          id: uid("tkn"),
          status: TokenStatus.ACTIVE,
          boundStudentName: null,
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.tokens.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = state.tokens.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        Object.assign(row, data);
        if (data.currentUses && typeof data.currentUses === "object" && "increment" in data.currentUses) {
          row.currentUses += Number((data.currentUses as { increment: number }).increment);
        }
        row.updatedAt = new Date();
        return row;
      })
    },
    attempt: {
      create: vi.fn(async ({ data }: { data: AttemptCreateData }) => {
        const row = {
          ...data,
          id: uid("att"),
          startedAt: new Date(),
          finishedAt: null,
          score: null,
          percentage: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.attempts.push(row);
        return row;
      }),
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: { token?: true; questionnaire?: { include?: { questions?: true } } } }) => {
        const row = state.attempts.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        if (!include) {
          return row;
        }
        const token = state.tokens.find((item) => item.id === row.tokenId) ?? null;
        const questionnaire = state.questionnaires.find((item) => item.id === row.questionnaireId) ?? null;
        const questions = state.questions.filter((item) => item.questionnaireId === row.questionnaireId);
        return {
          ...row,
          token,
          questionnaire: questionnaire ? { ...questionnaire, questions } : null
        };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<DbState["attempts"][number]> }) => {
        const row = state.attempts.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      })
    },
    answer: {
      createMany: vi.fn(async ({ data }: { data: Array<DbState["answers"][number]> }) => {
        state.answers.push(...data);
      })
    },
    feedbackReport: {
      create: vi.fn(async ({ data }: { data: DbState["reports"][number] }) => {
        state.reports.push(data);
      }),
      findUnique: vi.fn(async ({ where }: { where: { attemptId: string } }) => {
        const row = state.reports.find((item) => item.attemptId === where.attemptId);
        if (!row) {
          return null;
        }
        return {
          ...row,
          id: uid("rpt"),
          createdAt: new Date()
        };
      })
    },
    $transaction: vi.fn(async (callback: (tx: typeof api) => Promise<void>) => callback(api))
  };

  return api;
}

describe("critical questionnaire flow", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.JWT_SECRET = "test-secret-with-minimum-size";
    process.env.JWT_EXPIRES_IN = "15m";

    const state: DbState = {
      questionnaires: [],
      questions: [],
      tokens: [],
      attempts: [],
      answers: [],
      reports: []
    };

    Object.assign(prismaMock, buildMockPrisma(state));
  });

  it("creates questionnaire, generates token, submits once and blocks second attempt", async () => {
    const { createQuestionnaire, importQuestionsFromJson, publishQuestionnaire, generateTokens } = await import(
      "../services/adminService.js"
    );
    const { startAttempt, submitAttempt } = await import("../services/tokenService.js");

    const teacherId = "teacher-1";

    const questionnaire = await createQuestionnaire({
      teacherId,
      name: "Prova de Matematica",
      category: "Exatas",
      discipline: "Matematica",
      description: "Bimestre 1"
    });

    await importQuestionsFromJson({
      questionnaireId: questionnaire.id,
      teacherId,
      role: UserRole.ADMIN,
      questions: [
        {
          statement: "Quanto e 2 + 2?",
          options: ["2", "3", "4", "5"],
          correctAnswer: "4",
          topic: "aritmetica",
          weight: 1
        }
      ]
    });

    await publishQuestionnaire({
      questionnaireId: questionnaire.id,
      userId: teacherId,
      role: UserRole.ADMIN,
      isPublished: true
    });

    const tokenBatch = await generateTokens({
      questionnaireId: questionnaire.id,
      issuerId: teacherId,
      role: UserRole.ADMIN,
      quantity: 1,
      expiresInDays: 7
    });

    const start = await startAttempt({
      token: tokenBatch.tokens[0],
      studentFullName: "Aluno Teste Completo"
    });

    expect(start.questionnaire.questions.length).toBe(1);

    const submit = await submitAttempt({
      attemptId: start.attemptId,
      answers: [{ questionId: start.questionnaire.questions[0].id, answer: "4" }]
    });

    expect(submit.percentage).toBe(100);
    expect(submit.correctAnswers.length).toBe(1);

    await expect(
      startAttempt({
        token: tokenBatch.tokens[0],
        studentFullName: "Aluno Teste Completo"
      })
    ).rejects.toThrowError("TOKEN_UNAVAILABLE");
  });
});
