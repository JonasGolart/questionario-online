import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
config({ path: './apps/api/.env' });

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "jonas@gmail.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "jonas260778";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
      fullName: "Jonas Admin"
    },
    create: {
      email,
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
      fullName: "Jonas Admin"
    }
  });

  console.log("User updated/created:", JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    active: user.active
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
