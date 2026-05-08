import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const questionnaireId = 'a29b0ee0-4918-412e-92c1-6578422151fb';
  
  const tokens = await prisma.accessToken.findMany({
    where: { questionnaireId },
    include: {
      attempt: true
    }
  });

  console.log(`--- Tokens for Questionnaire ${questionnaireId} ---`);
  for (const t of tokens) {
    console.log(`Code: ${t.code} | Status: ${t.status} | Bound: ${t.boundStudentName || 'N/A'} | Attempt: ${t.attempt ? 'YES' : 'NO'}`);
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
