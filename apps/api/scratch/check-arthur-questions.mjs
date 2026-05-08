import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokenCode = 'ALUNO-WWW32U';
  
  const token = await prisma.accessToken.findUnique({
    where: { code: tokenCode },
    include: {
      attempt: true
    }
  });

  if (token && token.attempt) {
    console.log(`Token: ${token.code}`);
    console.log(`Selected Questions: ${token.attempt.selectedQuestionIds.length}`);
    console.log(`IDs: ${token.attempt.selectedQuestionIds}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
