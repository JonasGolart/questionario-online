import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    // Verificar se já existe um usuário
    const existing = await prisma.user.findFirst({
      where: { email: 'jonas@gmail.com' }
    });
    
    if (existing) {
      console.log('⚠️ Usuário jonas@gmail.com já existe!');
      console.log('Para fazer login, use:');
      console.log('Email: jonas@gmail.com');
      console.log('Senha: senha123');
      return;
    }

    const passwordHash = await bcrypt.hash('senha123', 10);
    const user = await prisma.user.create({
      data: {
        fullName: 'Jonas Professor',
        email: 'jonas@gmail.com',
        passwordHash,
        role: 'PROFESSOR',
        active: true
      }
    });
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('Email: jonas@gmail.com');
    console.log('Senha: senha123');
    console.log('Role: PROFESSOR');
    console.log('\n🌐 Acesse: http://localhost:3000/admin/login');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
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
