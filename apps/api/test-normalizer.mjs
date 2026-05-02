import { normalizeQuestions, extractQuestionsFromRawJson } from "./src/utils/questionNormalizer.js";

// Seu JSON com alternativas como objeto e resposta_correta como letra
const userJson = {
  "avaliacao": "Anatomia Humana I - Tecnologia em Radiologia",
  "questoes": [
    {
      "id": 1,
      "nivel": "Fácil",
      "pergunta": "Qual plano anatômico divide o corpo em partes superior e inferior?",
      "alternativas": {
        "a": "Plano Sagital",
        "b": "Plano Frontal",
        "c": "Plano Coronal",
        "d": "Plano Transversal",
        "e": "Plano Mediano"
      },
      "resposta_correta": "d"
    },
    {
      "id": 2,
      "nivel": "Fácil",
      "pergunta": "Quantas vértebras compõem a região cervical da coluna vertebral?",
      "alternativas": {
        "a": "5",
        "b": "7",
        "c": "12",
        "d": "4",
        "e": "8"
      },
      "resposta_correta": "b"
    },
    {
      "id": 3,
      "nivel": "Fácil",
      "pergunta": "O osso úmero é classificado anatomicamente como um osso:",
      "alternativas": {
        "a": "Curto",
        "b": "Plano",
        "c": "Longo",
        "d": "Irregular",
        "e": "Sesamoide"
      },
      "resposta_correta": "c"
    }
  ]
};

async function test() {
  try {
    console.log("📋 JSON Original:");
    console.log(JSON.stringify(userJson, null, 2));
    console.log("\n" + "=".repeat(80) + "\n");

    // Extrai questões
    const questions = extractQuestionsFromRawJson(userJson);
    console.log(`✅ Extraído ${questions.length} questões\n`);

    // Normaliza
    const normalized = normalizeQuestions(questions);
    console.log("📊 Questões Normalizadas:\n");

    normalized.forEach((q, i) => {
      console.log(`Questão ${i + 1}:`);
      console.log(`  Type: ${q.type}`);
      console.log(`  Statement: ${q.statement.substring(0, 60)}...`);
      if (q.type === "ESSAY") {
        console.log(`  Respostas Aceitáveis: ${q.correctAnswers?.join(", ")}`);
      } else {
        console.log(`  Opções: ${q.options?.join(", ")}`);
        console.log(`  Resposta Correta: ${q.correctAnswer}`);
      }
      console.log("");
    });

    console.log("=".repeat(80));
    console.log("✅ Conversão bem-sucedida!");
    console.log(`\nPronto para importar ${normalized.length} questões no sistema!`);
  } catch (error) {
    console.error("❌ Erro:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

test();
