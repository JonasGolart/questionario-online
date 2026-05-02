import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.accessToken.findMany({
    take: 5
  });
  
  console.log('Total tokens:', tokens.length);
  tokens.forEach(t => console.log(`- ${t.code} (${t.status})`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
