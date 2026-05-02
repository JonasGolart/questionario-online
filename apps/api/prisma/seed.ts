import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fullName = process.env.ADMIN_FULL_NAME ?? "Jonas";
  const email = (process.env.ADMIN_EMAIL ?? "jonas@gmail.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "jonas260778";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: UserRole.ADMIN,
        active: true
      }
    });
  }

  console.log("Seed concluido.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
