import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokenCode = 'ALUNO-29TSYZ';
  
  const token = await prisma.accessToken.findUnique({
    where: { code: tokenCode },
    include: {
      attempt: true
    }
  });

  if (!token) {
    console.log(`Token ${tokenCode} not found.`);
    return;
  }

  console.log('--- Token Information ---');
  console.log(`Code: ${token.code}`);
  console.log(`Status: ${token.status}`);
  console.log(`Bound Student: ${token.boundStudentName}`);
  console.log(`Attempt Started At: ${token.attempt?.startedAt}`);
  console.log(`Attempt Finished At: ${token.attempt?.finishedAt}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
