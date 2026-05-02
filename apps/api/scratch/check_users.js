import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config({ path: './apps/api/.env' });

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      fullName: true
    }
  });
  console.log("Users in DB:", JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
