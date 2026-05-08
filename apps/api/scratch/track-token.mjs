import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokenCode = 'ALUNO-WWW32U';
  
  const token = await prisma.accessToken.findUnique({
    where: { code: tokenCode },
    include: {
      attempt: {
        include: {
          answers: true
        }
      },
      questionnaire: true
    }
  });

  if (!token) {
    console.log(`Token ${tokenCode} not found.`);
    return;
  }

  console.log('--- Token Information ---');
  console.log(`ID: ${token.id}`);
  console.log(`Code: ${token.code}`);
  console.log(`Status: ${token.status}`);
  console.log(`Bound Student: ${token.boundStudentName}`);
  console.log(`Current Uses: ${token.currentUses}`);
  console.log(`Used At: ${token.usedAt}`);
  console.log(`Expires At: ${token.expiresAt}`);
  console.log(`Questionnaire: ${token.questionnaire.name} (${token.questionnaireId})`);

  if (token.attempt) {
    console.log('\n--- Attempt Information ---');
    console.log(`Attempt ID: ${token.attempt.id}`);
    console.log(`Student Name: ${token.attempt.studentFullName}`);
    console.log(`Started At: ${token.attempt.startedAt}`);
    console.log(`Finished At: ${token.attempt.finishedAt}`);
    console.log(`Score: ${token.attempt.score}`);
    console.log(`Answers Count: ${token.attempt.answers.length}`);
  } else {
    console.log('\nNo attempt associated with this token.');
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
