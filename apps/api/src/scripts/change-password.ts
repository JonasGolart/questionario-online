import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { UserRole } from "@prisma/client";

async function changeAdminPassword() {
  const newPassword = "Jonas260778!@#$%";
  
  console.log(`--- Buscando usuário administrador ---`);
  
  // Busca o primeiro usuário que seja ADMIN
  const user = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN }
  });

  if (!user) {
    console.error("❌ Erro: Nenhum usuário administrador encontrado no banco de dados.");
    process.exit(1);
  }

  console.log(`--- Alterando senha para o admin: ${user.email} ---`);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  console.log("✅ Senha alterada com sucesso!");
  process.exit(0);
}

changeAdminPassword().catch(err => {
  console.error("❌ Falha crítica:", err);
  process.exit(1);
});
