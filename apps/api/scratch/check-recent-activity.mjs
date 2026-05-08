import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const attempts = await prisma.attempt.findMany({
    where: {
      startedAt: { gte: oneHourAgo }
    },
    include: {
      token: true
    },
    orderBy: { startedAt: 'desc' }
  });

  console.log('--- Attempts in the Last Hour ---');
  for (const a of attempts) {
    console.log(`Time: ${a.startedAt} | Student: ${a.studentFullName} | Token: ${a.token.code} | Answers: ${a.answers?.length || 0}`);
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
