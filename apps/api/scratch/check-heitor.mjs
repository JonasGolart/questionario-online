import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = 'HEITOR DOS SANTOS FAGUNDES';
  
  const attempts = await prisma.attempt.findMany({
    where: { studentFullName: name },
    include: {
      token: true,
      answers: true
    }
  });

  console.log(`--- Attempts for ${name} ---`);
  for (const a of attempts) {
    console.log(`Token: ${a.token.code} | Started: ${a.startedAt} | Finished: ${a.finishedAt} | Answers: ${a.answers.length}`);
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
