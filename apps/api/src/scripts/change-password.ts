import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";

async function changeAdminPassword() {
  const email = "jonas@stackfab.com.br"; // Seu e-mail de admin
  const newPassword = "Jonas260778!@#$%";
  
  console.log(`--- Alterando senha para ${email} ---`);
  
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    console.error("❌ Erro: Usuário administrador não encontrado.");
    process.exit(1);
  }

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
