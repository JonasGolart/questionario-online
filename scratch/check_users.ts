import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true
    }
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const qs = await prisma.questionnaire.findMany({
    select: {
      id: true,
      name: true,
      teacherId: true,
      createdAt: true
    }
  });
  console.log("QUESTIONNAIRES:", JSON.stringify(qs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
