import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const questionnaires = await prisma.questionnaire.findMany({
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      isPublished: true
    }
  });
  console.log(JSON.stringify(questionnaires, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
