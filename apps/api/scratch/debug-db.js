import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const schema = await prisma.$queryRaw`SELECT current_schema()`;
  console.log('Current Schema:', JSON.stringify(schema));
  
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'questionario_online'`;
  console.log('Tables in questionario_online:', JSON.stringify(tables));

  const tokens = await prisma.accessToken.findMany();
  console.log('Tokens found:', tokens.length);
  tokens.forEach(t => console.log(`- ${t.code}`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
