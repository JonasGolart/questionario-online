import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokenCode = 'ALUNO-29TSYZ';
  
  const token = await prisma.accessToken.findUnique({
    where: { code: tokenCode },
    include: {
      attempt: {
        include: {
          answers: true
        }
      }
    }
  });

  if (token && token.attempt) {
    console.log(`Token: ${token.code}`);
    console.log(`Answers Count: ${token.attempt.answers.length}`);
  } else {
    console.log('Token or attempt not found');
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
