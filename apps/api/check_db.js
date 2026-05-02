import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
  const questionnaires = await prisma.questionnaire.findMany();
  console.log("Questionnaires in DB:", JSON.stringify(questionnaires, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
