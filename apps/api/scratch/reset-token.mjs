// Script para resetar o token ALUNO-KVGRNG e liberar a prova do aluno
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TOKEN_CODE = 'ALUNO-KVGRNG';

async function main() {
  const token = await prisma.accessToken.findUnique({
    where: { code: TOKEN_CODE },
    include: {
      attempt: {
        include: {
          answers: true,
          feedbackReport: true
        }
      },
      questionnaire: { select: { name: true } }
    }
  });

  if (!token) {
    console.error(`Token "${TOKEN_CODE}" nao encontrado.`);
    return;
  }

  console.log('Token encontrado:');
  console.log(`   Codigo: ${token.code}`);
  console.log(`   Status: ${token.status}`);
  console.log(`   Aluno vinculado: ${token.boundStudentName ?? 'Nenhum'}`);
  console.log(`   Questionario: ${token.questionnaire.name}`);
  console.log(`   Usos: ${token.currentUses}/${token.maxUses}`);

  if (token.attempt) {
    console.log(`   Tentativa: ${token.attempt.id}`);
    console.log(`   Score: ${token.attempt.score}`);
    console.log(`   Respostas: ${token.attempt.answers.length}`);
    console.log(`   Finalizado: ${token.attempt.finishedAt ? 'Sim' : 'Nao'}`);

    if (token.attempt.feedbackReport) {
      await prisma.feedbackReport.delete({
        where: { id: token.attempt.feedbackReport.id }
      });
      console.log('FeedbackReport deletado.');
    }

    const deletedAnswers = await prisma.answer.deleteMany({
      where: { attemptId: token.attempt.id }
    });
    console.log(`${deletedAnswers.count} respostas deletadas.`);

    await prisma.attempt.delete({
      where: { id: token.attempt.id }
    });
    console.log('Tentativa deletada.');
  } else {
    console.log('   (Sem tentativa associada)');
  }

  await prisma.accessToken.update({
    where: { code: TOKEN_CODE },
    data: {
      status: 'ACTIVE',
      currentUses: 0,
      usedAt: null
    }
  });

  console.log('\nToken resetado com sucesso!');
  console.log(`   ${TOKEN_CODE} -> status: ACTIVE, usos: 0`);
  console.log('   O aluno pode tentar novamente agora.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
