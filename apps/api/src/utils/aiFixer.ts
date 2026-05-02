import { jsonrepair } from 'jsonrepair';
import { normalizeQuestions, extractQuestionsFromRawJson } from './questionNormalizer.js';

export function aiFixJson(rawInput: string) {
  try {
    // 1. Tenta reparar a sintaxe bruta (vírgulas faltando, aspas, etc)
    const repaired = jsonrepair(rawInput);
    const parsed = JSON.parse(repaired);
    
    // 2. Extrai as questões (lidando com campos como "questoes", "questions", etc)
    const rawQuestions = extractQuestionsFromRawJson(parsed);
    
    // 3. Usa o nosso Normalizador Adaptativo para traduzir campos (Português -> Inglês)
    // e organizar a estrutura interna (opções, respostas, etc)
    const normalized = normalizeQuestions(rawQuestions);
    
    // 4. Retorna o JSON "perfeito" no formato esperado pelo backend
    return {
      questions: normalized.map(q => ({
        enunciado: q.statement, // Voltamos para nomes amigáveis no JSON de saída se necessário, 
                               // mas aqui usaremos o padrão do sistema
        statement: q.statement,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        topic: q.topic,
        weight: q.weight,
        imageUrl: q.imageUrl
      }))
    };
  } catch (error: any) {
    throw new Error(`Não foi possível corrigir automaticamente: ${error.message}`);
  }
}
