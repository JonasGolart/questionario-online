import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function closeJonasAttempt() {
  const token = await prisma.accessToken.findFirst({
    where: { code: 'ALUNO-U6QQWT' },
    include: { attempt: true }
  });

  if (!token?.attempt) {
    console.log('Tentativa não encontrada.');
    await prisma.$disconnect();
    return;
  }

  // Limpar respostas parciais, feedback, tentativa
  await prisma.answer.deleteMany({ where: { attemptId: token.attempt.id } });
  await prisma.feedbackReport.deleteMany({ where: { attemptId: token.attempt.id } });
  await prisma.attempt.delete({ where: { id: token.attempt.id } });

  // Resetar o token para livre
  await prisma.accessToken.update({
    where: { id: token.id },
    data: {
      status: 'ACTIVE',
      boundStudentName: null,
      currentUses: 0,
      usedAt: null
    }
  });

  console.log('✅ Tentativa do Jonas encerrada e token ALUNO-U6QQWT liberado.');

  await prisma.$disconnect();
}

closeJonasAttempt().catch(console.error);
