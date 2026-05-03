import { TokenStatus, QuestionType, Difficulty } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { prisma } from "../config/db.js";
import type { StudentStartRequest, StudentSubmitRequest } from "../types/domain.js";

export async function startAttempt(payloadOrApp: StudentStartRequest | FastifyInstance, payloadIfApp?: StudentStartRequest) {
  // Handle both old and new signatures for backward compatibility
  let app: FastifyInstance | null = null;
  let payload: StudentStartRequest;
  
  if (typeof payloadOrApp === 'object' && 'jwt' in payloadOrApp) {
    // New signature: (app, payload)
    app = payloadOrApp as FastifyInstance;
    payload = payloadIfApp!;
  } else {
    // Old signature: (payload) - for tests
    payload = payloadOrApp as StudentStartRequest;
  }
  const tokenCode = payload.token.trim().toUpperCase();
  const studentFullName = normalizeFullName(payload.studentFullName);

  console.log(`[DEBUG] Tentativa de início: Token=[${tokenCode}], Aluno=[${studentFullName}]`);

  const token = await prisma.accessToken.findFirst({
    where: { 
      code: {
        equals: tokenCode,
        mode: 'insensitive' // Adicionando busca case-insensitive por segurança
      }
    },
    include: {
      questionnaire: {
        include: {
          questions: {
            orderBy: { position: "asc" }
          }
        }
      },
      attempt: true
    }
  });

  const isTestToken = tokenCode === 'TEST-1234';
  console.log(`[DEBUG] Token encontrado: ${!!token}, isTestToken: ${isTestToken}, codeSearch: ${tokenCode}`);
  if (token) {
    console.log(`[DEBUG] Token ID: ${token.id}, Questionnaire: ${token.questionnaire.name}`);
  }

  if (!token) {
    throw new Error("TOKEN_INVALID");
  }

  // Bypass status and expiration for test token
  if (!isTestToken) {
    if (token.status !== TokenStatus.ACTIVE) {
      throw new Error("TOKEN_UNAVAILABLE");
    }

    if (!token.questionnaire.isPublished) {
      throw new Error("QUESTIONNAIRE_NOT_PUBLISHED");
    }

    if (token.questionnaire.scheduledDate) {
      const scheduled = new Date(token.questionnaire.scheduledDate);
      const now = new Date();
      // Comparar apenas a data (ignorando horário)
      const isSameDay = scheduled.getUTCFullYear() === now.getUTCFullYear() &&
                        scheduled.getUTCMonth() === now.getUTCMonth() &&
                        scheduled.getUTCDate() === now.getUTCDate();
      
      if (!isSameDay) {
        throw new Error("NOT_SCHEDULED_FOR_TODAY");
      }
    }

    if (token.expiresAt.getTime() < Date.now()) {
      await prisma.accessToken.update({
        where: { id: token.id },
        data: { status: TokenStatus.EXPIRED }
      });
      throw new Error("TOKEN_EXPIRED");
    }

    if (token.currentUses >= token.maxUses || token.attempt) {
      await prisma.accessToken.update({
        where: { id: token.id },
        data: { status: TokenStatus.USED }
      });
      throw new Error("TOKEN_ALREADY_USED");
    }

    if (token.boundStudentName && token.boundStudentName !== studentFullName) {
      throw new Error("TOKEN_BOUND_TO_OTHER_STUDENT");
    }
  }

  const sessionToken = isTestToken
    ? await prisma.accessToken.create({
        data: {
          code: await buildUniqueTestSessionCode(),
          questionnaireId: token.questionnaireId,
          issuerId: token.issuerId,
          status: TokenStatus.ACTIVE,
          boundStudentName: 'Aluno de Teste',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          maxUses: 1,
          currentUses: 0
        }
      })
    : await prisma.accessToken.update({
        where: { id: token.id },
        data: {
          boundStudentName: token.boundStudentName ?? studentFullName,
          status: TokenStatus.ACTIVE
        }
      });

  // Logic for random question selection
  const poolQuestions = token.questionnaire.questions.filter(q => q.includeInPool !== false);
  let selectedQuestions: typeof poolQuestions = [];

  const { easyCount, mediumCount, hardCount, questionsPerAttempt } = token.questionnaire;

  // Se o professor definiu quantidades específicas por nível
  if ((easyCount || mediumCount || hardCount) && (Number(easyCount || 0) + Number(mediumCount || 0) + Number(hardCount || 0)) > 0) {
    const easyPool = poolQuestions.filter(q => q.difficulty === Difficulty.EASY);
    const mediumPool = poolQuestions.filter(q => q.difficulty === Difficulty.MEDIUM);
    const hardPool = poolQuestions.filter(q => q.difficulty === Difficulty.HARD);

    const pickedEasy = shuffleArray(easyPool).slice(0, easyCount || 0);
    const pickedMedium = shuffleArray(mediumPool).slice(0, mediumCount || 0);
    const pickedHard = shuffleArray(hardPool).slice(0, hardCount || 0);

    selectedQuestions = [...pickedEasy, ...pickedMedium, ...pickedHard];
    
    // Se o professor quer embaralhar a ordem final
    if (token.questionnaire.shuffleQuestions) {
      selectedQuestions = shuffleArray(selectedQuestions);
    }
  } 
  // Senão, usa a lógica antiga de total aleatório
  else if (questionsPerAttempt && questionsPerAttempt > 0) {
    const count = Math.min(questionsPerAttempt, poolQuestions.length);
    selectedQuestions = shuffleArray(poolQuestions).slice(0, count);
  } 
  // Caso contrário, pega todas as questões do pool
  else {
    selectedQuestions = poolQuestions;
  }

  const selectedQuestionIds = selectedQuestions.map(q => q.id);

  const attempt = await prisma.attempt.create({
    data: {
      questionnaireId: sessionToken.questionnaireId,
      tokenId: sessionToken.id,
      studentFullName: isTestToken ? 'Aluno de Teste' : studentFullName,
      selectedQuestionIds
    }
  });

  let studentToken: string | null = null;
  if (app) {
    studentToken = await app.jwt.sign({ 
      sub: attempt.id, 
      role: 'student',
      questionnaireId: token.questionnaire.id 
    }, { expiresIn: `${(token.questionnaire.durationMinutes || 60) + 30}m` });
  }

  return {
    attemptId: attempt.id,
    studentToken,
    startedAt: attempt.startedAt,
    questionnaire: {
      id: token.questionnaire.id,
      name: token.questionnaire.name,
      discipline: token.questionnaire.discipline,
      category: token.questionnaire.category,
      description: token.questionnaire.description,
      durationMinutes: token.questionnaire.durationMinutes,
      shuffleQuestions: token.questionnaire.shuffleQuestions,
      questions: selectedQuestions.map((question) => ({
        id: question.id,
        statement: question.statement,
        imageUrl: question.imageUrl,
        options: question.options,
        position: question.position,
        weight: question.weight
      }))
    }
  };
}

export async function submitAttempt(payload: StudentSubmitRequest) {
  // Inicializar variáveis de retorno para garantir escopo fora da transação
  let finalScore = 0;
  let finalTotalPoints = 0;
  let finalCorrectionDetails: any = {};
  let finalAttemptId = payload.attemptId;

  // Iniciar transação para garantir atomicidade e evitar condições de corrida
  // Aumentado o timeout para 30s para evitar erros em servidores sob carga
  await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findUnique({
      where: { id: payload.attemptId },
      include: {
        token: true,
        questionnaire: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!attempt) {
      throw new Error("ATTEMPT_NOT_FOUND");
    }

    if (attempt.finishedAt) {
      throw new Error("ATTEMPT_ALREADY_FINISHED");
    }

  // Validação de tempo (Time-limit Protection)
  if (attempt.questionnaire.durationMinutes) {
    const now = new Date();
    const startedAt = new Date(attempt.startedAt);
    const diffInMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);
    const gracePeriod = 5; // 5 minutos de tolerância para latência de rede

    if (diffInMinutes > (attempt.questionnaire.durationMinutes + gracePeriod)) {
      throw new Error("EXAM_TIME_EXPIRED");
    }
  }

  // Filter questions if a subset was selected
  const activeQuestions = attempt.selectedQuestionIds.length > 0
    ? attempt.questionnaire.questions.filter(q => attempt.selectedQuestionIds.includes(q.id))
    : attempt.questionnaire.questions;

  const answerMap = new Map(payload.answers.map((answer) => [answer.questionId, answer.answer]));
  let score = 0;
  let totalPoints = 0;
  const topicStats = new Map<string, { total: number; correct: number }>();
  const correctionDetails: Array<{
    questionId: string;
    statement: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
    topic: string;
  }> = [];

  const answerRows = activeQuestions.map((question) => {
    const selectedAnswer = (answerMap.get(question.id) ?? "").trim();
    
    // Handle different question types
    let isCorrect = false;
    
    if (question.type === QuestionType.MULTIPLE_CHOICE && question.correctAnswer) {
      // Multiple choice - verify answer
      const normalizedSelected = selectedAnswer.toLowerCase();
      const normalizedCorrect = question.correctAnswer.toLowerCase();
      isCorrect = normalizedSelected.length > 0 && normalizedSelected === normalizedCorrect;
    } else if (question.type === QuestionType.ESSAY) {
      // Essay question - score is 0 by default, needs teacher review
      isCorrect = false;
    }
    
    const points = isCorrect ? question.weight : 0;
    totalPoints += question.weight;
    score += points;

    const topic = (question.topic ?? "geral").toLowerCase();
    const current = topicStats.get(topic) ?? { total: 0, correct: 0 };
    current.total += 1;
    current.correct += isCorrect ? 1 : 0;
    topicStats.set(topic, current);

    correctionDetails.push({
      questionId: question.id,
      statement: question.statement,
      selectedAnswer,
      correctAnswer: question.correctAnswer ?? "[Resposta discursiva]",
      isCorrect,
      points,
      topic
    });

    return {
      attemptId: attempt.id,
      questionId: question.id,
      answerValue: selectedAnswer,
      isCorrect,
      points
    };
  });

    await tx.answer.createMany({ data: answerRows });

    const percentage = totalPoints === 0 ? 0 : Number(((score / totalPoints) * 100).toFixed(2));

    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        finishedAt: new Date(),
        score,
        percentage
      }
    });

    // Atribuir valores para as variáveis externas
    finalScore = score;
    finalTotalPoints = totalPoints;
    finalCorrectionDetails = correctionDetails;
    finalAttemptId = attempt.id;

    await tx.accessToken.update({
      where: { id: attempt.tokenId },
      data: {
        status: TokenStatus.USED,
        usedAt: new Date(),
        currentUses: { increment: 1 }
      }
    });

    const weakTopics = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        percentage: stats.total === 0 ? 0 : Number(((stats.correct / stats.total) * 100).toFixed(2))
      }))
      .filter((item) => item.percentage < 70)
      .sort((a, b) => a.percentage - b.percentage);

    await tx.feedbackReport.create({
      data: {
        attemptId: attempt.id,
        summary: buildSummary(score, totalPoints),
        stats: {
          score,
          totalPoints,
          percentage: totalPoints === 0 ? 0 : Number(((score / totalPoints) * 100).toFixed(2))
        },
        weakTopics
      }
    });
  }, {
    timeout: 30000 // 30 segundos
  });

  const report = await prisma.feedbackReport.findUnique({ where: { attemptId: finalAttemptId } });
  const reportStats = report?.stats as any;

  return {
    score: reportStats?.score ?? finalScore,
    percentage: reportStats?.percentage ?? (finalTotalPoints === 0 ? 0 : Number(((finalScore / finalTotalPoints) * 100).toFixed(2))),
    feedback: report?.summary ?? buildSummary(finalScore, finalTotalPoints),
    weakTopics: (report?.weakTopics as any[]) ?? [],
    correctAnswers: finalCorrectionDetails
  };
}

export async function startTimer(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId }
  });

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.startedAt) {
    return attempt;
  }
  
  return prisma.attempt.update({
    where: { id: attemptId },
    data: {
      startedAt: new Date()
    }
  });
}

export async function registerTabSwitch(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId }
  });

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.finishedAt) {
    return attempt;
  }

  return prisma.attempt.update({
    where: { id: attemptId },
    data: {
      tabSwitches: { increment: 1 }
    }
  });
}

async function buildUniqueTestSessionCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `TESTRUN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const exists = await prisma.accessToken.findUnique({ where: { code } });
    if (!exists) {
      return code;
    }
  }

  throw new Error("TOKEN_GENERATION_FAILED");
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeFullName(name: string): string {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (cleaned.length < 5) {
    throw new Error("STUDENT_NAME_INVALID");
  }
  return cleaned;
}

function buildSummary(score: number, totalPoints: number): string {
  const percentage = totalPoints === 0 ? 0 : Number(((score / totalPoints) * 100).toFixed(2));
  if (percentage >= 85) {
    return "Excelente desempenho. Continue com a mesma consistencia de estudo.";
  }
  if (percentage >= 70) {
    return "Bom desempenho. Revise os topicos com mais erros para subir sua nota.";
  }
  return "Resultado abaixo do esperado. Foque nos topicos indicados e refaca seu plano de estudo.";
}
