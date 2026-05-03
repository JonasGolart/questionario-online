import bcrypt from "bcryptjs";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import type { FastifyInstance } from "fastify";
import { UserRole, QuestionType, Difficulty } from "@prisma/client";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import {
  normalizeQuestions,
  extractQuestionsFromRawJson,
  type NormalizedQuestion
} from "../utils/questionNormalizer.js";

type CreateQuestionnaireInput = {
  teacherId: string;
  name: string;
  category: string;
  discipline: string;
  description?: string | null;
  durationMinutes?: number | null;
  questionsPerAttempt?: number | null;
  easyCount?: number | null;
  mediumCount?: number | null;
  hardCount?: number | null;
  scheduledDate?: string | null;
  shuffleQuestions?: boolean | null;
};

type QuestionImportInput = {
  statement: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: string;
  topic?: string;
  weight?: number;
};

export async function bootstrapAdmin(input: { fullName: string; email: string; password: string }) {
  const existing = await prisma.user.count();
  if (existing > 0) {
    throw new Error("BOOTSTRAP_ALREADY_DONE");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const admin = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  return {
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role
  };
}

export async function loginAdmin(app: FastifyInstance, input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (!user || !user.active) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const accessToken = await app.jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email
    },
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  };
}

export async function createQuestionnaire(input: CreateQuestionnaireInput) {
  return prisma.questionnaire.create({
    data: {
      teacherId: input.teacherId,
      name: input.name,
      category: input.category,
      discipline: input.discipline,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes ?? null,
      questionsPerAttempt: input.questionsPerAttempt ?? null,
      easyCount: input.easyCount ?? null,
      mediumCount: input.mediumCount ?? null,
      hardCount: input.hardCount ?? null,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
      shuffleQuestions: input.shuffleQuestions ?? true
    }
  });
}

export async function publishQuestionnaire(input: {
  questionnaireId: string;
  userId: string;
  role: UserRole;
  isPublished: boolean;
}) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId },
    include: { questions: true }
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && questionnaire.teacherId !== input.userId) {
    throw new Error("FORBIDDEN");
  }

  if (input.isPublished && questionnaire.questions.length === 0) {
    throw new Error("QUESTIONNAIRE_WITHOUT_QUESTIONS");
  }

  return prisma.questionnaire.update({
    where: { id: input.questionnaireId },
    data: { isPublished: input.isPublished }
  });
}

export async function updateQuestionnaire(input: {
  questionnaireId: string;
  userId: string;
  role: UserRole;
  name?: string;
  category?: string;
  discipline?: string;
  description?: string | null;
  durationMinutes?: number | null;
  questionsPerAttempt?: number | null;
  easyCount?: number | null;
  mediumCount?: number | null;
  hardCount?: number | null;
  scheduledDate?: string | null;
  shuffleQuestions?: boolean | null;
}) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId }
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && questionnaire.teacherId !== input.userId) {
    throw new Error("FORBIDDEN");
  }

  return prisma.questionnaire.update({
    where: { id: input.questionnaireId },
    data: {
      name: input.name,
      category: input.category,
      discipline: input.discipline,
      description: input.description,
      durationMinutes: input.durationMinutes,
      questionsPerAttempt: input.questionsPerAttempt,
      easyCount: input.easyCount,
      mediumCount: input.mediumCount,
      hardCount: input.hardCount,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : (input.scheduledDate === null || input.scheduledDate === "" ? null : undefined),
      shuffleQuestions: input.shuffleQuestions ?? undefined
    }
  });
}

export async function listQuestionnaires(userId: string, role: UserRole) {
  return prisma.questionnaire.findMany({
    where: role === UserRole.ADMIN ? undefined : { teacherId: userId },
    include: {
      questions: {
        orderBy: { position: "asc" }
      },
      tokens: {
        include: {
          attempt: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function deleteQuestionnaire(input: {
  questionnaireId: string;
  userId: string;
  role: UserRole;
}) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId },
    include: { tokens: true }
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && questionnaire.teacherId !== input.userId) {
    throw new Error("FORBIDDEN");
  }

  const hasUsedTokens = questionnaire.tokens.some((t) => t.status === "USED" || t.boundStudentName);
  if (hasUsedTokens) {
    throw new Error("CANNOT_DELETE_WITH_USED_TOKENS");
  }

  // Delete tokens and questions first due to relations, then the questionnaire
  await prisma.$transaction(async (tx) => {
    await tx.accessToken.deleteMany({ where: { questionnaireId: input.questionnaireId } });
    await tx.question.deleteMany({ where: { questionnaireId: input.questionnaireId } });
    await tx.questionnaire.delete({ where: { id: input.questionnaireId } });
  });

  return { success: true };
}

export async function importQuestionsFromJson(input: {
  questionnaireId: string;
  teacherId: string;
  role: UserRole;
  questions: any[];
}) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId }
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && questionnaire.teacherId !== input.teacherId) {
    throw new Error("FORBIDDEN");
  }

  // Normalize questions - this handles multiple formats and detects question types
  const normalized = normalizeQuestions(input.questions);

  // 1. Descobrir a última posição para continuar a sequência
  const lastQuestion = await prisma.question.findFirst({
    where: { questionnaireId: input.questionnaireId },
    orderBy: { position: 'desc' },
    select: { position: true }
  });
  const startPosition = (lastQuestion?.position || 0) + 1;

  // 2. Mapear questões com as novas posições
  const dbQuestions = normalized.map((question: NormalizedQuestion, index: number) => {
    const baseData = {
      questionnaireId: input.questionnaireId,
      type: question.type,
      difficulty: question.difficulty,
      statement: question.statement,
      imageUrl: question.imageUrl || null,
      topic: question.topic || null,
      weight: question.weight,
      position: startPosition + index,
      includeInPool: true
    };

    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      return {
        ...baseData,
        options: question.options,
        correctAnswer: question.correctAnswer,
        correctAnswers: []
      };
    } else {
      return {
        ...baseData,
        options: [],
        correctAnswer: null,
        correctAnswers: question.correctAnswers || []
      };
    }
  });

  await prisma.$transaction(async (tx) => {
    // REMOVIDO: tx.question.deleteMany
    await tx.question.createMany({ data: dbQuestions });
  });

  return prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId },
    include: {
      questions: { orderBy: { position: "asc" } }
    }
  });
}

export async function importQuestionsFromPdf(input: {
  questionnaireId: string;
  teacherId: string;
  role: UserRole;
  pdfBase64: string;
}) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId }
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && questionnaire.teacherId !== input.teacherId) {
    throw new Error("FORBIDDEN");
  }

  const cleanedBase64 = input.pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
  if (cleanedBase64.length === 0) {
    throw new Error("PDF_INVALID");
  }

  const pdfBuffer = Buffer.from(cleanedBase64, "base64");

  return importQuestionsFromPdfBuffer({
    questionnaireId: input.questionnaireId,
    teacherId: input.teacherId,
    role: input.role,
    pdfBuffer
  });
}

export async function importQuestionsFromPdfBuffer(input: {
  questionnaireId: string;
  teacherId: string;
  role: UserRole;
  pdfBuffer: Buffer;
}) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId }
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && questionnaire.teacherId !== input.teacherId) {
    throw new Error("FORBIDDEN");
  }

  if (!input.pdfBuffer || input.pdfBuffer.length === 0) {
    throw new Error("PDF_INVALID");
  }

  const data = await pdf(input.pdfBuffer);
  const extractedQuestions = parseQuestionsFromText(data.text);

  if (extractedQuestions.length === 0) {
    throw new Error("PDF_PARSE_NO_QUESTIONS");
  }

  const lastQuestion = await prisma.question.findFirst({
    where: { questionnaireId: input.questionnaireId },
    orderBy: { position: 'desc' },
    select: { position: true }
  });
  const startPosition = (lastQuestion?.position || 0) + 1;

  const normalizedQuestions = extractedQuestions.map((question, index) => {
    if (question.options.length < 2) {
      throw new Error("QUESTION_OPTIONS_INVALID");
    }

    if (!question.options.includes(question.correctAnswer)) {
      throw new Error("QUESTION_CORRECT_ANSWER_INVALID");
    }

    return {
      questionnaireId: input.questionnaireId,
      statement: question.statement,
      options: question.options,
      correctAnswer: question.correctAnswer,
      topic: "extraido_pdf",
      weight: 1,
      position: startPosition + index,
      includeInPool: true
    };
  });

  await prisma.$transaction(async (tx) => {
    // REMOVIDO: tx.question.deleteMany
    await tx.question.createMany({ data: normalizedQuestions });
  });

  return prisma.questionnaire.findUnique({
    where: { id: input.questionnaireId },
    include: {
      questions: { orderBy: { position: "asc" } }
    }
  });
}

export async function generateTokens(input: {
  questionnaireId: string;
  issuerId: string;
  role: UserRole;
  quantity: number;
  expiresInDays: number;
}) {
  const questionnaire = await prisma.questionnaire.findUnique({ where: { id: input.questionnaireId } });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && questionnaire.teacherId !== input.issuerId) {
    throw new Error("FORBIDDEN");
  }

  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
  const createdTokens: string[] = [];

  for (let index = 0; index < input.quantity; index += 1) {
    const code = await buildUniqueTokenCode();

    await prisma.accessToken.create({
      data: {
        code,
        questionnaireId: input.questionnaireId,
        issuerId: input.issuerId,
        expiresAt,
        maxUses: 1,
        currentUses: 0
      }
    });

    createdTokens.push(code);
  }

  return {
    questionnaireId: input.questionnaireId,
    count: createdTokens.length,
    expiresAt,
    tokens: createdTokens
  };
}

export async function updateQuestion(input: {
  questionId: string;
  userId: string;
  role: UserRole;
  type?: QuestionType;
  difficulty?: Difficulty;
  statement?: string;
  imageUrl?: string | null;
  options?: string[];
  correctAnswer?: string | null;
  correctAnswers?: string[];
  topic?: string | null;
  weight?: number;
  includeInPool?: boolean;
}) {
  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    include: {
      questionnaire: true
    }
  });

  if (!question) {
    throw new Error("QUESTION_NOT_FOUND");
  }

  if (input.role !== UserRole.ADMIN && question.questionnaire.teacherId !== input.userId) {
    throw new Error("FORBIDDEN");
  }

  const baseData = {
    type: input.type || question.type,
    difficulty: input.difficulty || question.difficulty,
    statement: (input.statement || question.statement).trim(),
    imageUrl: input.imageUrl !== undefined ? (input.imageUrl?.trim() || null) : question.imageUrl,
    topic: input.topic !== undefined ? (input.topic?.trim() || null) : question.topic,
    weight: input.weight && input.weight > 0 ? Math.round(input.weight) : (question.weight || 1),
    includeInPool: input.includeInPool !== undefined ? input.includeInPool : question.includeInPool
  };

  if (baseData.type === QuestionType.ESSAY) {
    const normalizedCorrectAnswers = input.correctAnswers !== undefined 
      ? (input.correctAnswers || []).map((answer) => answer.trim()).filter((answer) => answer.length > 0)
      : question.correctAnswers;

    return prisma.question.update({
      where: { id: input.questionId },
      data: {
        ...baseData,
        options: [],
        correctAnswer: null,
        correctAnswers: normalizedCorrectAnswers
      }
    });
  }

  const options = input.options !== undefined 
    ? (input.options || []).map((option) => option.trim()).filter((option) => option.length > 0)
    : (question.options as string[]);
    
  const correctAnswer = input.correctAnswer !== undefined 
    ? (input.correctAnswer || "").trim()
    : question.correctAnswer;

  if (options.length < 2) {
    throw new Error("QUESTION_OPTIONS_INVALID");
  }

  if (correctAnswer && !options.includes(correctAnswer)) {
    throw new Error("QUESTION_CORRECT_ANSWER_INVALID");
  }

  return prisma.question.update({
    where: { id: input.questionId },
    data: {
      ...baseData,
      options,
      correctAnswer,
      correctAnswers: []
    }
  });
}

async function buildUniqueTokenCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `ALUNO-${randomChunk(6)}`;
    const exists = await prisma.accessToken.findUnique({ where: { code } });
    if (!exists) {
      return code;
    }
  }

  throw new Error("TOKEN_GENERATION_FAILED");
}

function randomChunk(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    output += alphabet[randomIndex];
  }
  return output;
}

type ParsedOption = {
  label: string;
  text: string;
  isMarkedCorrect: boolean;
};

function parseOptionLine(line: string): ParsedOption | null {
  const cleaned = line.trim();
  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/^(?<mark>(?:\[|\*)?\s*)?(?:\(?(?<label>[A-Ea-e])\)?[).:-])\s*(?<content>.+)$/);
  if (!match?.groups?.label || !match.groups.content) {
    return null;
  }

  const content = match.groups.content.trim();
  if (!content) {
    return null;
  }

  const label = match.groups.label.toUpperCase();
  const startsMarked = /^(\[x\]|\(x\)|\*)\s*/i.test(content);
  const containsCorrectHint = /(correta|certa|correct)/i.test(content);
  const startsWithMark = /(?:\[|\*)/.test((match.groups.mark || "").trim());

  const text = content
    .replace(/^(\[x\]|\(x\)|\*)\s*/i, "")
    .replace(/\s*\((correta|certa|correct)\)$/i, "")
    .trim();

  return {
    label,
    text,
    isMarkedCorrect: startsWithMark || startsMarked || containsCorrectHint
  };
}

function detectAnswerKeyLetter(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(
      /(?:gabarito|resposta\s*corr?eta|alternativa\s*corr?eta|answer|correct\s*answer)\s*[:-]?\s*(?:letra\s*)?([A-E])/i
    );
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

function parseQuestionsFromText(text: string): QuestionImportInput[] {
  const normalizedText = text
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const blocks = normalizedText
    .split(/\n(?=(?:\d+[).:-]\s|quest[aã]o\s*\d+\s*[).:-]\s))/i)
    .map((chunk) => chunk.trim())
    .filter((chunk) => /^(?:\d+[).:-]\s|quest[aã]o\s*\d+\s*[).:-]\s)/i.test(chunk));

  const extracted: QuestionImportInput[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 3) {
      continue;
    }

    const statement = lines[0].replace(/^(?:\d+[).:-]\s*|quest[aã]o\s*\d+\s*[).:-]\s*)/i, "").trim();
    const parsedOptions = lines
      .map(parseOptionLine)
      .filter((option): option is ParsedOption => option !== null)
      .filter((option) => option.text.length > 0);

    if (statement.length < 3 || parsedOptions.length < 2) {
      continue;
    }

    const options = parsedOptions.map((option) => option.text);
    const answerKeyLetter = detectAnswerKeyLetter(lines);
    const byLabel = new Map(parsedOptions.map((option) => [option.label, option.text]));
    const markedCorrect = parsedOptions.filter((option) => option.isMarkedCorrect);

    let correctAnswer = options[0];

    if (answerKeyLetter && byLabel.has(answerKeyLetter)) {
      correctAnswer = byLabel.get(answerKeyLetter)!;
    } else if (markedCorrect.length === 1) {
      correctAnswer = markedCorrect[0].text;
    }

    extracted.push({
      statement,
      options,
      correctAnswer
    });
  }

  return extracted;
}

export async function getQuestionnaireReport(questionnaireId: string) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: questionnaireId },
    include: {
      teacher: true,
      questions: true,
      attempts: {
        orderBy: { finishedAt: "desc" },
        include: {
          answers: true,
          feedbackReport: true
        }
      }
    }
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  const finishedAttempts = questionnaire.attempts
    .filter((a): a is NonNullable<typeof a> => !!a && !!a.finishedAt);

  const totalStudents = finishedAttempts.length;
  const avgScore = totalStudents > 0 
    ? finishedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalStudents 
    : 0;

  // Topic analysis
  const topicStats = new Map<string, { total: number; correct: number }>();
  finishedAttempts.forEach(attempt => {
    attempt.answers.forEach(answer => {
      const question = questionnaire.questions.find(q => q.id === answer.questionId);
      const topic = (question?.topic || "Geral").toLowerCase();
      const current = topicStats.get(topic) || { total: 0, correct: 0 };
      current.total += 1;
      current.correct += answer.isCorrect ? 1 : 0;
      topicStats.set(topic, current);
    });
  });

  const topics = Array.from(topicStats.entries()).map(([name, stats]) => ({
    name,
    total: stats.total,
    correct: stats.correct,
    percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
  })).sort((a, b) => a.percentage - b.percentage);

  return {
    header: {
      name: questionnaire.name,
      discipline: questionnaire.discipline,
      category: questionnaire.category,
      teacherName: questionnaire.teacher.fullName,
      scheduledDate: questionnaire.scheduledDate,
      totalStudents,
      avgScore,
      maxScore: questionnaire.questions.reduce((acc, q) => acc + q.weight, 0)
    },
    students: finishedAttempts.map(a => {
      const correctCount = a.answers.filter(ans => ans.isCorrect).length;
      return {
        name: a.studentFullName,
        score: a.score,
        percentage: a.percentage,
        correctCount,
        incorrectCount: a.answers.length - correctCount,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        tabSwitches: a.tabSwitches
      };
    }),
    topics
  };
}
