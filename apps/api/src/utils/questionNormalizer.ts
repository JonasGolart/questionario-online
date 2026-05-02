import { QuestionType, Difficulty } from "@prisma/client";

type RawQuestion = Record<string, any>;

export type NormalizedQuestion = {
  type: QuestionType;
  difficulty: Difficulty;
  statement: string;
  imageUrl?: string | null;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  topic?: string;
  weight: number;
};

/**
 * Detecta o tipo de questão analisando sua estrutura
 */
export function detectQuestionType(raw: RawQuestion): QuestionType {
  // Se tem "options" com múltiplas opções ou é array → MULTIPLE_CHOICE
  if (raw.options && Array.isArray(raw.options) && raw.options.length >= 2) {
    return QuestionType.MULTIPLE_CHOICE;
  }

  // Se tem "gabarito" como array com múltiplas respostas → ESSAY (múltiplas respostas corretas)
  if (raw.gabarito && Array.isArray(raw.gabarito) && raw.gabarito.length > 1) {
    return QuestionType.ESSAY;
  }

  // Se tem "correctAnswer" com valor único → MULTIPLE_CHOICE
  if (raw.correctAnswer && typeof raw.correctAnswer === "string") {
    return QuestionType.MULTIPLE_CHOICE;
  }

  // Se tem "gabarito" com array simples (1 item) e opções → MULTIPLE_CHOICE
  if (raw.gabarito && Array.isArray(raw.gabarito) && raw.gabarito.length === 1 && raw.options) {
    return QuestionType.MULTIPLE_CHOICE;
  }

  // Se tem "gabarito" com array e SEM opções → ESSAY (respostas múltiplas aceitáveis)
  if (raw.gabarito && Array.isArray(raw.gabarito)) {
    return QuestionType.ESSAY;
  }

  // Default: ESSAY (questão discursiva)
  return QuestionType.ESSAY;
}

/**
 * Extrai campos de enunciado com suporte a múltiplas aliases
 */
function extractStatement(raw: RawQuestion): string {
  const statement =
    raw.statement ||
    raw.enunciado ||
    raw.pergunta ||
    raw.question ||
    raw.titulo ||
    raw.text ||
    raw.conteudo;

  if (!statement || typeof statement !== "string") {
    throw new Error("Não foi encontrado campo de enunciado (statement, enunciado, pergunta, question, etc)");
  }

  return statement.trim();
}

/**
 * Extrai imagem com suporte a múltiplas aliases
 */
function extractImage(raw: RawQuestion): string | null {
  const image =
    raw.imageUrl ||
    raw.image_url ||
    raw.imagem ||
    raw.image ||
    raw.grafico ||
    raw.figura ||
    raw.imagemUrl;

  if (!image) return null;
  if (typeof image !== "string") return null;

  const trimmed = image.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extrai opções com suporte a múltiplas aliases.
 * Aceita arrays ou objetos {a: "...", b: "...", ...}
 */
function extractOptions(raw: RawQuestion): { values: string[]; keyMap: Record<string, string> } | null {
  const options = raw.options || raw.opcoes || raw.alternativas || raw.choices;

  if (!options) return null;

  // Formato objeto: {a: "Plano Sagital", b: "Plano Frontal", ...}
  if (typeof options === "object" && !Array.isArray(options)) {
    const keyMap: Record<string, string> = {};
    const values: string[] = [];
    for (const [key, val] of Object.entries(options)) {
      const text = String(val).trim();
      if (text.length > 0) {
        keyMap[key.toLowerCase()] = text;
        values.push(text);
      }
    }
    return values.length >= 2 ? { values, keyMap } : null;
  }

  // Formato array: ["Opção A", "Opção B", ...]
  if (Array.isArray(options)) {
    const values = options
      .map((opt: any) => {
        if (typeof opt === "string") return opt.trim();
        if (typeof opt === "object" && opt.texto) return opt.texto.trim();
        if (typeof opt === "object" && opt.text) return opt.text.trim();
        return String(opt).trim();
      })
      .filter((opt: string) => opt.length > 0);
    return values.length >= 2 ? { values, keyMap: {} } : null;
  }

  return null;
}

/**
 * Extrai respostas corretas com suporte a múltiplas aliases.
 * Aceita letra ("d"), texto ou array.
 */
function extractCorrectAnswers(raw: RawQuestion): string[] {
  const answers =
    raw.correctAnswers ||
    raw.correct_answers ||
    raw.respostasCorretas ||
    raw.gabarito ||
    raw.correctAnswer ||
    raw.resposta_correta ||
    raw.answer ||
    raw.resposta;

  // Se for array, retorna normalizado
  if (Array.isArray(answers)) {
    return answers
      .map((a: any) => {
        if (typeof a === "string") return a.trim();
        return String(a).trim();
      })
      .filter((a: string) => a.length > 0);
  }

  // Se for string única, retorna como array
  if (typeof answers === "string") {
    return [answers.trim()];
  }

  throw new Error("Não foi encontrado campo de resposta correta");
}

/**
 * Normaliza uma questão detectando formato e convertendo para padrão interno
 */
export function normalizeQuestion(raw: RawQuestion, index: number): NormalizedQuestion {
  const statement = extractStatement(raw);
  const imageUrl = extractImage(raw);
  const correctAnswers = extractCorrectAnswers(raw);
  const topic = (raw.topic || raw.topico || raw.assunto || raw.tema || "").trim() || undefined;
  const weight = Math.max(1, Math.floor(Number(raw.weight || raw.peso || 1)));

  // Difficulty normalization
  const rawDifficulty = String(raw.difficulty || raw.dificuldade || raw.level || raw.nivel || raw.nivel_dificuldade || "").toUpperCase();
  let difficulty: Difficulty = Difficulty.MEDIUM;
  
  if (rawDifficulty.includes("FACIL") || rawDifficulty.includes("FÁCIL") || rawDifficulty.includes("EASY")) {
    difficulty = Difficulty.EASY;
  } else if (rawDifficulty.includes("MEDIO") || rawDifficulty.includes("MÉDIO") || rawDifficulty.includes("MEDIUM")) {
    difficulty = Difficulty.MEDIUM;
  } else if (rawDifficulty.includes("DIFICIL") || rawDifficulty.includes("DIFÍCIL") || rawDifficulty.includes("HARD")) {
    difficulty = Difficulty.HARD;
  }

  const optionsResult = extractOptions(raw);

  // Detect type based on whether we have options
  const type = optionsResult && optionsResult.values.length >= 2
    ? QuestionType.MULTIPLE_CHOICE
    : QuestionType.ESSAY;

  if (type === QuestionType.MULTIPLE_CHOICE) {
    const { values: options, keyMap } = optionsResult!;

    // Resolve correct answer: may be a letter ("d") or full text
    let correctAnswer = correctAnswers[0] ?? "";

    // If it's a single letter and we have a keyMap, resolve to full text
    if (/^[a-zA-Z]$/.test(correctAnswer.trim()) && Object.keys(keyMap).length > 0) {
      const resolved = keyMap[correctAnswer.trim().toLowerCase()];
      if (resolved) correctAnswer = resolved;
    }

    // If still a letter (array format), try to map by index (a=0, b=1, ...)
    if (/^[a-zA-Z]$/.test(correctAnswer.trim()) && options.length > 0) {
      const idx = correctAnswer.trim().toLowerCase().charCodeAt(0) - 97; // a=0, b=1...
      if (idx >= 0 && idx < options.length) {
        correctAnswer = options[idx];
      }
    }

    if (!correctAnswer || !options.includes(correctAnswer)) {
      throw new Error(
        `Questão ${index + 1}: Resposta correta "${correctAnswers[0]}" não está nas opções disponíveis`
      );
    }

    return {
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty,
      statement,
      imageUrl,
      options,
      correctAnswer,
      topic,
      weight
    };
  } else {
    // ESSAY - discursiva com múltiplas respostas aceitáveis
    return {
      type: QuestionType.ESSAY,
      difficulty,
      statement,
      imageUrl,
      correctAnswers: correctAnswers.length > 0 ? correctAnswers : [""],
      topic,
      weight
    };
  }
}

/**
 * Normaliza múltiplas questões
 */
export function normalizeQuestions(rawQuestions: RawQuestion[]): NormalizedQuestion[] {
  if (!Array.isArray(rawQuestions)) {
    throw new Error("JSON deve conter um array de questões");
  }

  if (rawQuestions.length === 0) {
    throw new Error("Array de questões está vazio");
  }

  return rawQuestions.map((q, i) => normalizeQuestion(q, i));
}

/**
 * Valida se o JSON importado contém questões
 */
export function extractQuestionsFromRawJson(data: any): RawQuestion[] {
  // Se é array direto
  if (Array.isArray(data)) {
    return data;
  }

  // Se é objeto com campo "questions" ou "questoes"
  if (typeof data === "object" && data !== null) {
    const questions =
      data.questions ||
      data.questoes ||
      data.items ||
      data.itens ||
      data.questions_list ||
      data.questionList;

    if (Array.isArray(questions)) {
      return questions;
    }
  }

  throw new Error("JSON deve conter um array de questões ou um objeto com campo 'questions'/'questoes'");
}
