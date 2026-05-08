// Resetar token ALUNO-JQ9XUW do Guilherme
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const token = await prisma.accessToken.findUnique({
    where: { code: 'ALUNO-JQ9XUW' },
    include: {
      attempt: {
        include: { answers: true, feedbackReport: true }
      }
    }
  });

  if (!token) { console.log('Token não encontrado!'); return; }

  if (token.attempt) {
    if (token.attempt.feedbackReport) {
      await prisma.feedbackReport.delete({ where: { id: token.attempt.feedbackReport.id } });
      console.log('FeedbackReport deletado.');
    }
    await prisma.answer.deleteMany({ where: { attemptId: token.attempt.id } });
    console.log('Respostas deletadas.');
    await prisma.attempt.delete({ where: { id: token.attempt.id } });
    console.log('Tentativa deletada.');
  }

  await prisma.accessToken.update({
    where: { code: 'ALUNO-JQ9XUW' },
    data: { status: 'ACTIVE', currentUses: 0, usedAt: null }
  });

  console.log('\n✅ Token ALUNO-JQ9XUW resetado! Guilherme pode tentar novamente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
