import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.accessToken.findMany({
    where: { boundStudentName: { not: null } },
    orderBy: { boundStudentName: 'asc' }
  });

  const students = new Map();
  for (const t of tokens) {
    if (!students.has(t.boundStudentName)) {
      students.set(t.boundStudentName, []);
    }
    students.get(t.boundStudentName).push(t);
  }

  console.log('--- Students with Multiple Tokens ---');
  for (const [name, studentTokens] of students.entries()) {
    if (studentTokens.length > 1) {
      console.log(`Student: ${name}`);
      for (const t of studentTokens) {
        console.log(`  Code: ${t.code} | Status: ${t.status} | Created: ${t.createdAt}`);
      }
    }
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
