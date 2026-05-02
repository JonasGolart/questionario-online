import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Questionnaire' AND table_schema = 'questionario_online'`;
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
