import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokenCode = process.env.TOKEN_CODE || 'ALUNO-QSVXAF';
  
  console.log(`Buscando token: ${tokenCode}...`);
  
  const token = await prisma.accessToken.findUnique({
    where: { code: tokenCode },
    include: {
      questionnaire: true,
      attempt: {
        include: {
          answers: {
            include: {
              question: true
            }
          }
        }
      }
    }
  });

  if (!token) {
    console.log('Token não encontrado.');
    return;
  }

  console.log('\n--- TOKEN INFO ---');
  console.log(`ID: ${token.id}`);
  console.log(`Status: ${token.status}`);
  console.log(`Aluno Vinculado: ${token.boundStudentName || 'Ninguém'}`);
  console.log(`Questionário: ${token.questionnaire.name}`);
  console.log(`Duração: ${token.questionnaire.durationMinutes} min`);

  if (!token.attempt) {
    console.log('\nNenhuma tentativa iniciada para este token.');
  } else {
    const attempt = token.attempt;
    const startedAt = attempt.startedAt ? new Date(attempt.startedAt) : null;
    const durationMs = (token.questionnaire.durationMinutes || 60) * 60 * 1000;
    const expiresAt = startedAt ? new Date(startedAt.getTime() + durationMs) : null;
    const now = new Date();

    console.log('\n--- ATTEMPT INFO ---');
    console.log(`ID: ${attempt.id}`);
    console.log(`Iniciado em: ${startedAt}`);
    console.log(`Expira em: ${expiresAt}`);
    console.log(`Horário atual (Script): ${now}`);
    console.log(`Finalizado em: ${attempt.finishedAt || 'Ainda em andamento'}`);
    
    if (!attempt.finishedAt && expiresAt && now > expiresAt) {
      console.log('⚠️ TEMPO ESGOTADO! O aluno excedeu o tempo mas não submeteu.');
    }

    console.log(`Score: ${attempt.score}`);
    console.log(`Total de respostas: ${attempt.answers.length}`);

    console.log('\n--- QUESTÕES RESPONDIDAS ---');
    attempt.answers.forEach((ans, i) => {
      console.log(`${i+1}. [QID: ${ans.questionId}] ${ans.question.statement.substring(0, 50)}...`);
      console.log(`   Resposta: ${ans.answerValue} | Correta: ${ans.isCorrect}`);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
