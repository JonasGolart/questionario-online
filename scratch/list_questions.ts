import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const questionnaires = await prisma.questionnaire.findMany({
    include: { _count: { select: { questions: true } } }
  });
  console.log(JSON.stringify(questionnaires, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
