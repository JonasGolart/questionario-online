import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const questionnaires = await prisma.questionnaire.findMany();
  const questions = await prisma.question.findMany();
  const attempts = await prisma.attempt.findMany();
  const tokens = await prisma.accessToken.findMany();
  
  console.log('📊 Estado do Banco de Dados:');
  console.log('- Questionários:', questionnaires.length);
  console.log('- Questões:', questions.length);
  console.log('- Tentativas:', attempts.length);
  console.log('- Tokens:', tokens.length);
  
  await prisma.$disconnect();
}

main().catch(console.error);
