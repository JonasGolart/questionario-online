import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const token = await prisma.accessToken.findUnique({
    where: { code: 'TEST-1234' }
  });
  
  if (token) {
    console.log('Token encontrado:', JSON.stringify(token, null, 2));
  } else {
    console.log('Token NÃO encontrado.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
