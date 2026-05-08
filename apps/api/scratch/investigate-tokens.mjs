// Investigar TODOS os tokens da "Avaliação 1 de CA" e buscar Guilherme
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Buscar o token que foi resetado
  const resetToken = await prisma.accessToken.findUnique({
    where: { code: 'ALUNO-KVGRNG' },
    include: {
      questionnaire: { select: { id: true, name: true } },
      attempt: true
    }
  });

  console.log('=== TOKEN RESETADO ===');
  console.log(`Código: ${resetToken.code}`);
  console.log(`Status atual: ${resetToken.status}`);
  console.log(`Aluno vinculado: ${resetToken.boundStudentName}`);
  console.log(`Questionário: ${resetToken.questionnaire.name} (${resetToken.questionnaire.id})`);
  console.log(`Tentativa atual: ${resetToken.attempt ? resetToken.attempt.id : 'NENHUMA (foi deletada)'}`);
  console.log('');

  // 2. Buscar TODOS os tokens desse questionário
  const allTokens = await prisma.accessToken.findMany({
    where: { questionnaireId: resetToken.questionnaire.id },
    include: {
      attempt: {
        select: {
          id: true,
          studentFullName: true,
          score: true,
          percentage: true,
          finishedAt: true,
          startedAt: true,
          tabSwitches: true,
          answers: { select: { id: true } }
        }
      }
    },
    orderBy: { code: 'asc' }
  });

  console.log(`=== TODOS OS TOKENS DA "${resetToken.questionnaire.name}" (${allTokens.length} tokens) ===\n`);
  
  for (const t of allTokens) {
    const status = t.status.padEnd(7);
    const student = (t.boundStudentName || '-').padEnd(35);
    const email = (t.sentToEmail || '-').padEnd(30);
    const hasAttempt = t.attempt ? `Score: ${t.attempt.score}, Respostas: ${t.attempt.answers.length}, Fim: ${t.attempt.finishedAt ? 'SIM' : 'NÃO'}` : 'SEM TENTATIVA';
    console.log(`${t.code} | ${status} | ${student} | ${email} | ${hasAttempt}`);
  }

  // 3. Buscar especificamente por "Guilherme"
  console.log('\n=== BUSCA POR "GUILHERME" EM TODOS OS TOKENS ===');
  const guilhermeTokens = await prisma.accessToken.findMany({
    where: {
      boundStudentName: { contains: 'Guilherme', mode: 'insensitive' }
    },
    include: {
      questionnaire: { select: { name: true } },
      attempt: { select: { id: true, score: true, finishedAt: true } }
    }
  });

  if (guilhermeTokens.length === 0) {
    console.log('Nenhum token vinculado a "Guilherme" encontrado em todo o sistema.');
  } else {
    for (const t of guilhermeTokens) {
      console.log(`${t.code} | ${t.status} | ${t.boundStudentName} | ${t.questionnaire.name} | Tentativa: ${t.attempt ? `Score ${t.attempt.score}` : 'Nenhuma'}`);
    }
  }

  // 4. Buscar tentativas do Guilherme
  console.log('\n=== BUSCA POR TENTATIVAS DO "GUILHERME" ===');
  const guilhermeAttempts = await prisma.attempt.findMany({
    where: {
      studentFullName: { contains: 'Guilherme', mode: 'insensitive' }
    },
    include: {
      questionnaire: { select: { name: true } },
      token: { select: { code: true } },
      answers: { select: { id: true } }
    }
  });

  if (guilhermeAttempts.length === 0) {
    console.log('Nenhuma tentativa encontrada para "Guilherme".');
  } else {
    for (const a of guilhermeAttempts) {
      console.log(`Token: ${a.token.code} | ${a.studentFullName} | ${a.questionnaire.name} | Score: ${a.score} | Respostas: ${a.answers.length} | Fim: ${a.finishedAt}`);
    }
  }

  // 5. Buscar tentativas do Daniel
  console.log('\n=== BUSCA POR TENTATIVAS DO "DANIEL" ===');
  const danielAttempts = await prisma.attempt.findMany({
    where: {
      studentFullName: { contains: 'Daniel', mode: 'insensitive' }
    },
    include: {
      questionnaire: { select: { name: true } },
      token: { select: { code: true } },
      answers: { select: { id: true } }
    }
  });

  if (danielAttempts.length === 0) {
    console.log('Nenhuma tentativa restante para "Daniel" (a que existia foi deletada no reset).');
  } else {
    for (const a of danielAttempts) {
      console.log(`Token: ${a.token.code} | ${a.studentFullName} | ${a.questionnaire.name} | Score: ${a.score} | Respostas: ${a.answers.length} | Fim: ${a.finishedAt}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
